import { randomUUID } from "node:crypto";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { authorizeAdmin } from "../../../../lib/server/admin";
import { getDatabasePool } from "../../../../lib/server/db";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIME_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);
const VALID_KEYS = new Set([
  "hero_image", "lifestyle_image", "hero_leaves", "note_top", "note_heart", "note_base",
  "product-edp", "product-edt", "product-ext",
]);

const UPLOAD_NAME = /^[a-z0-9_-]+-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|avif)$/i;

async function getImageReferences() {
  const pool = getDatabasePool();
  const [[products], [sections]] = await Promise.all([
    pool.query("SELECT name, img AS image_url FROM store_products"),
    pool.query("SELECT content_key, image_url FROM storefront_content"),
  ]);
  const references = new Map();
  for (const product of products) {
    const list = references.get(product.image_url) || [];
    list.push(`Product: ${product.name}`);
    references.set(product.image_url, list);
  }
  for (const section of sections) {
    const list = references.get(section.image_url) || [];
    list.push(`Section: ${section.content_key.replaceAll("_", " ")}`);
    references.set(section.image_url, list);
  }
  return references;
}

export async function GET() {
  try {
    const auth = await authorizeAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const directory = join(process.cwd(), "public", "assets", "uploads");
    let files = [];
    try {
      files = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const references = await getImageReferences();
    const images = files
      .filter((entry) => entry.isFile() && UPLOAD_NAME.test(entry.name))
      .map((entry) => {
        const url = `/assets/uploads/${entry.name}`;
        const usedBy = references.get(url) || [];
        return { name: entry.name, url, usedBy };
      })
      .sort((first, second) => first.name.localeCompare(second.name));
    return NextResponse.json({ images });
  } catch (error) {
    console.error("Could not load admin image library:", error);
    return NextResponse.json({ error: "Image library could not be loaded." }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const auth = await authorizeAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const formData = await request.formData();
    const file = formData.get("file");
    const key = formData.get("key");
    const extension = file instanceof File ? MIME_EXTENSIONS.get(file.type) : null;
    if (typeof key !== "string" ||
      (key !== "library" && !VALID_KEYS.has(key) && !/^product-[a-z0-9_-]{1,16}$/.test(key)) ||
      !extension ||
      file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Choose a JPEG, PNG, WebP or AVIF image up to 5 MB." }, { status: 400 });
    }

    const directory = join(process.cwd(), "public", "assets", "uploads");
    await mkdir(directory, { recursive: true });
    const fileName = `${key === "library" ? "image" : key}-${randomUUID()}.${extension}`;
    await writeFile(join(directory, fileName), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
    return NextResponse.json({ url: `/assets/uploads/${fileName}` });
  } catch (error) {
    console.error("Could not upload admin image:", error);
    return NextResponse.json({ error: "Image upload failed. Check local storage permissions and try again." }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await authorizeAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const fileName = new URL(request.url).searchParams.get("file");
    if (!fileName || !UPLOAD_NAME.test(fileName)) {
      return NextResponse.json({ error: "Choose a valid uploaded image." }, { status: 400 });
    }

    const url = `/assets/uploads/${fileName}`;
    const references = await getImageReferences();
    const usedBy = references.get(url) || [];
    if (usedBy.length) {
      return NextResponse.json({ error: `This image is still in use: ${usedBy.join(", ")}. Save a replacement first.` }, { status: 409 });
    }

    await unlink(join(process.cwd(), "public", "assets", "uploads", fileName));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error.code === "ENOENT") return NextResponse.json({ error: "This image no longer exists." }, { status: 404 });
    console.error("Could not delete admin image:", error);
    return NextResponse.json({ error: "Image could not be deleted." }, { status: 503 });
  }
}
