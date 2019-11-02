
const wechat = require('../wechat/wechat')
const config = require('../config/wechat.json')
let wechatApp = new wechat(config)
module.exports = {
    //公众号认证接入
    'GET /wechat/index': async (ctx, next) => {
        wechatApp.auth(ctx.request, ctx.response);
    },
    // 公众号消息
    'POST /wechat/index': async (ctx, next) => {
        await wechatApp.handleMsg(ctx).then(res => {
            wechatApp.responseMsg(ctx, res)
        })
    },
    // 获取公众号token
    'GET /wechat/getAccessToken': async (ctx, next) => {
        wechatApp.getAccessToken().then(function (data) {
            ctx.response.type = 'text'
            ctx.response.body = data
        });
    },
     // 网页授权获取openid
    'GET /wechat/openid': async (ctx, next) => {
        let code=ctx.request.query.code
        wechatApp.snsapi_base(code).then(function (data) {

            ctx.response.type = 'text'
            ctx.response.body = data
        });
    },
     // 获取用户信息
     'GET /wechat/userInfo': async (ctx, next) => {
         let openid=ctx.request.query.openid
        await  wechatApp.userInfo(openid).then(function (data) {
              ctx.body=data
          });
      },
    // 创建公众号菜单
    'GET /menu/create': async (ctx, next) => {
      await  wechatApp.menu('create').then(function (data) {
            ctx.body=data
        });
    },
     // 删除公众号菜单
     'GET /menu/delete': async (ctx, next) => {
        await wechatApp.menu('delete').then(function (data) {
             ctx.body=data
         });
     },
    // 获取公众号菜单
    'GET /menu/get': async (ctx, next) => {
       await wechatApp.menu('get').then(function (data) {
            ctx.body=data
        });
    },
    // 页面跳转
    'GET /wechat/redirect': async (ctx, next) => {
        ctx.response.redirect('https://www.baidu.com');
     },
    'GET /wechat/test': async (ctx, next) => {

        let echostr = '123'
        ctx.response.type = 'application/json';
        ctx.response.body = {
            echostr: echostr
        };
    }
};