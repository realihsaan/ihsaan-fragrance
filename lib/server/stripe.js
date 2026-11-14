import Stripe from "stripe";

let stripe;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  stripe ||= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

export function getAllowedShippingCountries() {
  const countries = process.env.STRIPE_ALLOWED_COUNTRIES
    ?.split(",")
    .map((country) => country.trim().toUpperCase())
    .filter(Boolean);

  if (!countries?.length || countries.some((country) => !/^[A-Z]{2}$/.test(country))) {
    throw new Error("STRIPE_ALLOWED_COUNTRIES must contain ISO two-letter country codes.");
  }

  return [...new Set(countries)];
}

export function getAppUrl() {
  const configuredUrl = process.env.APP_URL;
  if (!configuredUrl) throw new Error("APP_URL is not configured.");

  const url = new URL(configuredUrl);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
    throw new Error("APP_URL must use HTTPS outside local development.");
  }
  if (url.username || url.password) throw new Error("APP_URL cannot contain credentials.");

  return url.origin;
}
