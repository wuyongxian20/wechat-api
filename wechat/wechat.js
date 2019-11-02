'use strict' //设置为严格模式

const crypto = require('crypto'), //引入加密模块
    https = require('https'), //引入 htts 模块
    util = require('util'), //引入 util 工具包
    fs = require('fs'), //引入 fs 模块
    urltil = require('url'), //引入 url 模块
    accessTokenJson = require('./access_token'), //引入本地存储的 access_token
    menus = require('./menus'), //引入微信菜单配置
    parseString = require('xml2js').parseString, //引入xml2js包
    msg = require('./msg'), //引入消息处理模块
    CryptoGraphy = require('./cryptoGraphy'); //微信消息加解密模块

var logger = require('log4js').getLogger("index");

/**
 * 构建 WeChat 对象 即 js中 函数就是对象
 * @param {JSON} config 微信配置文件 
 */
var WeChat = function (config) {
    //设置 WeChat 对象属性 config
    this.config = config;
    //设置 WeChat 对象属性 token
    this.token = config.token;
    //设置 WeChat 对象属性 appID
    this.appID = config.appID;
    //设置 WeChat 对象属性 appScrect
    this.appScrect = config.appScrect;
    //设置 WeChat 对象属性 apiDomain
    this.apiDomain = config.apiDomain;
    //设置 WeChat 对象属性 apiURL
    this.apiURL = config.apiURL;

    /**
     * 用于处理 https Get请求方法
     * @param {String} url 请求地址 
     */
    this.requestGet = function (url) {
        return new Promise(function (resolve, reject) {
            https.get(url, function (res) {
                var buffer = [],
                    result = "";
                //监听 data 事件
                res.on('data', function (data) {
                    buffer.push(data);
                });
                //监听 数据传输完成事件
                res.on('end', function () {
                    result = Buffer.concat(buffer).toString('utf-8');
                    //将最后结果返回
                    resolve(result);
                });
            }).on('error', function (err) {
                reject(err);
            });
        });
    }

    /**
     * 用于处理 https Post请求方法
     * @param {String} url  请求地址
     * @param {JSON} data 提交的数据
     */
    this.requestPost = function (url, data) {
        return new Promise(function (resolve, reject) {
            //解析 url 地址
            var urlData = urltil.parse(url);
            //设置 https.request  options 传入的参数对象
            var options = {
                //目标主机地址
                hostname: urlData.hostname,
                //目标地址 
                path: urlData.path,
                //请求方法
                method: 'POST',
                //头部协议
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(data, 'utf-8')
                }
            };
            var req = https.request(options, function (res) {
                    var buffer = [],
                        result = '';
                    //用于监听 data 事件 接收数据
                    res.on('data', function (data) {
                        buffer.push(data);
                    });
                    //用于监听 end 事件 完成数据的接收
                    res.on('end', function () {
                        result = Buffer.concat(buffer).toString('utf-8');
                        resolve(result);
                    })
                })
                //监听错误事件
                .on('error', function (err) {
                    console.log(err);
                    reject(err);
                });
            //传入数据
            req.write(data);
            req.end();
        });
    }
}

/**
 * 微信接入验证
 * @param {Request} req Request 对象
 * @param {Response} res Response 对象
 */
WeChat.prototype.auth = function (req, res) {

    var that = this;

    //1.获取微信服务器Get请求的参数 signature、timestamp、nonce、echostr
    var signature = req.query.signature, //微信加密签名
        timestamp = req.query.timestamp, //时间戳
        nonce = req.query.nonce, //随机数
        echostr = req.query.echostr; //随机字符串

    //2.将token、timestamp、nonce三个参数进行字典序排序
    var array = [this.token, timestamp, nonce];
    array.sort();

    //3.将三个参数字符串拼接成一个字符串进行sha1加密
    var tempStr = array.join('');
    const hashCode = crypto.createHash('sha1'); //创建加密类型 
    var resultCode = hashCode.update(tempStr, 'utf8').digest('hex'); //对传入的字符串进行加密

    //4.开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
    if (resultCode === signature) {
        res.body = echostr
        // res.send(echostr);
    } else {
        res.body = mismatch
        // res.send('mismatch');
    }
}

/**
 * 菜单操作
 * @param {*} menuType :create:创建菜单；delete：删除菜单；get：查询菜单
 */
WeChat.prototype.userInfo = async function (openid) {
        return new Promise((resolve, reject) => {
            let that = this
            this.getAccessToken().then(function (data) {
                //格式化请求连接
                var url = util.format(that.apiURL.userInfo, that.apiDomain, data, openid);
                logger.info('url', url)
                //使用 Get 请求查询或删除微信菜单
                that.requestGet(url).then(function (data) {
                    resolve(data)
                    //将结果打印
                    console.log(data);
                });

            });
        })

    },

    /**
     * 菜单操作
     * @param {*} menuType :create:创建菜单；delete：删除菜单；get：查询菜单
     */
    WeChat.prototype.menu = async function (menuType) {
            return new Promise((resolve, reject) => {
                let that = this
                this.getAccessToken().then(function (data) {
                    logger.info('getAccessToken', data)
                    let menuValue = ''
                    switch (menuType) {
                        case 'create':
                            menuValue = that.apiURL.createMenu;
                            break;
                        case 'delete':
                            menuValue = that.apiURL.deleteMenu;
                            break;
                        case 'get':
                            menuValue = that.apiURL.queryMenu;
                            break;
                    }
                    //格式化请求连接
                    var url = util.format(menuValue, that.apiDomain, data);

                    logger.info('url', url)
                    if (menuType == 'create') {
                        //使用 Post 请求创建微信菜单
                        that.requestPost(url, JSON.stringify(menus)).then(function (data) {
                            logger.info('create menu result', data)
                            resolve(data)
                            //将结果打印
                            console.log(data);
                        });
                    } else {
                        //使用 Get 请求查询或删除微信菜单
                        that.requestGet(url).then(function (data) {
                            logger.info('query menu result', data)
                            resolve(data)
                            //将结果打印
                            console.log(data);
                        });
                    }

                });
            })

        },
        /**
         * 通过snsapi_base 方式获取用户的openid和网页授权access_token（与调用微信接口使用的access_token不同）
         */
        WeChat.prototype.snsapi_base = async function (code) {
            logger.info('snsapi_base code', code)
            var that = this;
            return new Promise(function (resolve, reject) {
                //格式化请求地址
                var url = util.format(that.apiURL.snsapi_base, that.apiDomain, that.appID, that.appScrect, code);
                that.requestGet(url).then(function (data) {
                    resolve(data);
                });
            });
        }

/**
 * 获取微信 access_token
 */
WeChat.prototype.getAccessToken = function () {
    var that = this;
    return new Promise(function (resolve, reject) {
        //获取当前时间 
        var currentTime = new Date().getTime();
        //格式化请求地址
        var url = util.format(that.apiURL.accessTokenApi, that.apiDomain, that.appID, that.appScrect);
        //判断 本地存储的 access_token 是否有效
        if (accessTokenJson.access_token === "" || accessTokenJson.expires_time < currentTime) {
            that.requestGet(url).then(function (data) {
                var result = JSON.parse(data);
                if (data.indexOf("errcode") < 0) {
                    accessTokenJson.access_token = result.access_token;
                    accessTokenJson.expires_time = new Date().getTime() + (parseInt(result.expires_in) - 200) * 1000;
                    //更新本地存储的
                    fs.writeFile('./wechat/access_token.json', JSON.stringify(accessTokenJson));
                    //将获取后的 access_token 返回
                    resolve(accessTokenJson.access_token);
                } else {
                    //将错误返回
                    resolve(result);
                }
            });
        } else {
            //将本地存储的 access_token 返回
            resolve(accessTokenJson.access_token);
        }
    });
}

/**
 * 微信消息回复
 * @param {ctx} context 对象
 * @param {result} 微信消息
 */
WeChat.prototype.responseMsg = function (ctx, result) {
        var toUser = result.ToUserName; //接收方微信
        var fromUser = result.FromUserName; //发送仿微信
        var reportMsg = ""; //声明回复消息的变量   
        if (result.MsgType.toLowerCase() === "event") {
            //判断事件类型
            switch (result.Event.toLowerCase()) {
                case 'subscribe':
                    //回复消息
                    var content = "欢迎关注 线上随访 公众号\n";
                    content += "我们致力于帮助出院康复病人与医生建立便捷的沟通渠道~\n";
                    reportMsg = msg.txtMsg(fromUser, toUser, content);
                    break;
                case 'click':
                    var contentArr = [{
                            Title: "Node.js 微信自定义菜单",
                            Description: "使用Node.js实现自定义微信菜单",
                            PicUrl: "http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",
                            Url: "http://blog.csdn.net/hvkcoder/article/details/72868520"
                        },
                        {
                            Title: "Node.js access_token的获取、存储及更新",
                            Description: "Node.js access_token的获取、存储及更新",
                            PicUrl: "http://img.blog.csdn.net/20170528151333883?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",
                            Url: "http://blog.csdn.net/hvkcoder/article/details/72783631"
                        },
                        {
                            Title: "Node.js 接入微信公众平台开发",
                            Description: "Node.js 接入微信公众平台开发",
                            PicUrl: "http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",
                            Url: "http://blog.csdn.net/hvkcoder/article/details/72765279"
                        }
                    ];
                    //回复图文消息
                    reportMsg = msg.graphicMsg(fromUser, toUser, contentArr);
                    break;
            }
        } else {
            //判断消息类型为 文本消息
            if (result.MsgType.toLowerCase() === "text") {
                switch (result.Content) {
                    case '1':
                        reportMsg = msg.txtMsg(fromUser, toUser, 'Hello ，线上随访公众号开通了，快来使用吧……');
                        break;
                    case '2':
                        reportMsg = msg.txtMsg(fromUser, toUser, 'Ha Ha，我还有更多的功能待发掘呢，敬请期待吧……');
                        break;
                    case '文章':
                        var contentArr = [{
                                Title: "Node.js 微信自定义菜单",
                                Description: "使用Node.js实现自定义微信菜单",
                                PicUrl: "http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",
                                Url: "http://blog.csdn.net/hvkcoder/article/details/72868520"
                            },
                            {
                                Title: "Node.js access_token的获取、存储及更新",
                                Description: "Node.js access_token的获取、存储及更新",
                                PicUrl: "http://img.blog.csdn.net/20170528151333883?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",
                                Url: "http://blog.csdn.net/hvkcoder/article/details/72783631"
                            },
                            {
                                Title: "Node.js 接入微信公众平台开发",
                                Description: "Node.js 接入微信公众平台开发",
                                PicUrl: "http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",
                                Url: "http://blog.csdn.net/hvkcoder/article/details/72765279"
                            }
                        ];
                        //回复图文消息
                        reportMsg = msg.graphicMsg(fromUser, toUser, contentArr);
                        break;
                    default:
                        reportMsg = msg.txtMsg(fromUser, toUser, '没有这个选项哦');
                        break;
                }
                // logger.info("on reportMsg", reportMsg);
            }
        }
        //返回给微信服务器
        ctx.body = reportMsg
    },


    WeChat.prototype.handleMsg = async function (ctx) {
            return new Promise((resolve, reject) => {

                // let req = ctx.request;
                // let res = ctx.response;
                let req = ctx.req;
                var buffer = [],
                    that = this;

                //实例微信消息加解密
                // var cryptoGraphy = new CryptoGraphy(that.config,ctx.request);
                //监听 data 事件 用于接收数据
                req.on('data', function (data) {
                    // logger.info("on data", data);
                    buffer.push(data);
                });
                req.on('end', function () {
                    // logger.info("on end");
                    var msgXml = Buffer.concat(buffer).toString('utf-8');

                    parseString(msgXml, {
                        explicitArray: false
                    }, function (err, result) {
                        // logger.info("on result", result);
                        result = result.xml;
                        resolve(result)
                    })
                });
            })

        },


        WeChat.prototype.test = async function () {
                let that = this
                return new Promise((resolve, reject) => {
                    let n = that.test2()
                    logger.info('n', n)
                    setTimeout(() => {
                        let n = Math.random(0, 2)
                        if (n > 0.5) {
                            resolve('100')
                        } else {
                            resolve('0')
                        }
                    }, 1000);

                })
            },
            WeChat.prototype.test2 = function () {
                return 1
            }

//暴露可供外部访问的接口
module.exports = WeChat;