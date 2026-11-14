// Store settings and catalogue. Edit freely. Replace photos in assets/images (same names) or change `img`.
const SHIPPING={flat:8,express:18,freeOver:150};
const COUPONS={WELCOME10:10,IHSAAN15:15}; // code -> % off (examples, change or remove)
const STAGES=['Order placed','Packed','Shipped','Delivered'];
const NOTES={top:'Bergamot, Black Pepper, Cardamom',heart:'Orris, Jasmine, Cedarwood',base:'Amber, Sandalwood, Musk'};
const PRODUCTS=[
 {id:'edp',type:'fragrance',name:'Velvet Smoke Eau de Parfum',short:'Eau de Parfum',price:120,stock:24,size:'50 ml',tag:'Warm. Spiced. Magnetic.',img:'assets/images/product-eau-de-parfum.jpg',desc:'The classic Velvet Smoke. A warm, spiced heart over amber and sandalwood that settles close to the skin.'},
 {id:'edt',type:'fragrance',name:'Velvet Smoke Eau de Toilette',short:'Eau de Toilette',price:120,stock:3,size:'50 ml',tag:'Luminous. Elegant. Refined.',img:'assets/images/product-eau-de-toilette.jpg',desc:'A lighter, brighter reading of Velvet Smoke. Bergamot and jasmine lead, made for daytime.'},
 {id:'ext',type:'fragrance',name:'Velvet Smoke Extrait de Parfum',short:'Extrait de Parfum',price:140,stock:12,size:'50 ml',tag:'Bold. Intense. Unforgettable.',img:'assets/images/product-extrait-de-parfum.jpg',desc:'The deepest concentration. Amber, musk and sandalwood that stay with you well into the night.'}
];
