
const wechat = require('../wechat/wechat')
const config = require('../config/wechat.json')
let wechatApp = new wechat(config)
module.exports = {
    // 公众号消息
    'GET /oauth/index': async (ctx, next) => {
        let code=ctx.request.query.code
      await  wechatApp.snsapi_base(code).then(function (data) {
            ctx.response.type = 'text'
            ctx.response.body = data
        });
    }
};