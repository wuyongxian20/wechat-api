    
var products = [{
    name: 'iPhone',
    price: 6999
}, {
    name: 'Kindle',
    price: 9999
}];


const wechat=require('../wechat/wechat')
// let sql=require('../mysql/mysql.js')

module.exports = {
    'GET /api/products': async (ctx, next) => {
        ctx.response.type = 'application/json';
      
        ctx.response.body = {
            products: products
        };
    },

    'POST /api/products': async (ctx, next) => {
        var p = {
            name: ctx.request.body.name,
            price: ctx.request.body.price
        };
        products.push(p);
        ctx.response.type = 'application/json';
        ctx.response.body = p;
    }
};