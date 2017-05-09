//登录和注册需要的User类
var User = require('../models/user');
//发表需要的Post类
var Post = require('../models/post');
//引入留言需要的Comment类
var Comment = require('../models/comment');
//需要引入一个加密的模块
var crypto = require('crypto');
var album = require('../models/album.js')
var fs = require("fs");
var path = require('path')
var sd = require("silly-datetime");
//引入multer插件
var multer = require('multer');
var formidable = require('formidable');
var change=require('../models/edituser');
//插件的配置信息
var storage = multer.diskStorage({
    //这个是上传图片的地址.
    destination: function (req, file, cb) {
        cb(null, 'public/images')
    },
    //上传到服务器上图片的名字.
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})
var upload = multer({storage: storage, size: 10225});

//一个权限的问题？
//1.用户未登录的情况下，是无法访问/post ,/logout的
//2.用户在登录的情况下，是无法访问/login,/reg 的
//那么，如果才能完成这个权限的问题呢？

function checkLogin(req, res, next) {
    if (!req.session.user) {
        req.flash('error', '未登录!');
        res.redirect('/login');
    }
    next();
}
//如果登录了，是无法访问登录和注册页面的
function checkNotLogin(req, res, next) {
    if (req.session.user) {
        req.flash('error', '已登录!');
        res.redirect('back');//返回之前的页面
    }
    next();
}
module.exports = function (app) {
    //首页
    app.get('/', function (req, res, next) {
        var page = parseInt(req.query.p) || 1;
        Post.getTen(null, page, function (err, posts, total) {
            if (err) {
                next();
                return;
            }

            var names=[];
            var touxiangs=[];
            (function iterator(i) {
                if(i==posts.length){
                    res.render('index', {
                        title: '浏览文章',
                        user: req.session.user,
                        page: page,
                        name:req.session.user?req.session.user.name:"i博客",
                        touxiang:req.session.user?req.session.user.touxiang:"moren.jpg",
                        touxiangs:touxiangs,
                        posts: posts,
                        isFirstPage: (page - 1) == 0,
                        isLastPage: (page - 1) * 10 + posts.length == total,
                        success: req.flash('success').toString(),
                        error: req.flash('error').toString(),
                        color: ["label label-success", "label label-info", "label label-warning"]
                    })
                    console.log(touxiangs);
                    // return touxiangs;
                    return;
                }
                //可以用statSync进行同步的读文件 ，完全可以用for循环
                names.push(posts[i].name);
                User.get(names[i],function (err,user) {
                    touxiangs.push(user.touxiang);
                    iterator(i+1)
                })

            })(0);

        })

    })
    //注册页面
    app.get('/reg', checkNotLogin);
    app.get('/reg', function (req, res) {
        res.render('reg', {
            title: '注册',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString(),
            name:req.session.user?req.session.user.name:"i博客",
            touxiang:req.session.user?req.session.user.touxiang:"moren.jpg"
        })
    })
    //注册行为
    app.post('/reg', checkNotLogin);
    app.post('/reg', function (req, res) {
        //数据接收req.body
        //console.log(req.body);
        //用户名
        var name = req.body.name;
        //密码
        var password = req.body.password;
        //确认密码
        var password_re = req.body['password-repeat'];
        //邮箱
        var email = req.body.email;
        var touxiang='/moren.jpg';
        //补充一下，如果未填写的情况下，提示用户
        if (name == '' || password == '' || password_re == '' || email == '') {
            console.log('error', '请正确填写信息');
            return res.status(200).json({message:"请正确填写信息"});
        }
        //1.首先检查一下两次密码是否一样
        if (password_re != password) {
            //先保存一下当前的错误信息
            console.log('error', '用户两次输入的密码不一样');
            return res.status(200).json({message:"用户两次输入的密码不一样"});
        }
        //2.对密码进行加密处理
        var md5 = crypto.createHash('md5');
        var password = md5.update(req.body.password).digest('hex');
        //console.log(password);

        //3.可以开始实例化User对象了
        var newUser = new User({
            name: name,
            password: password,
            email: email,
            touxiang:touxiang
        });
        //4.检查用户名是否存在
        User.get(newUser.name, function (err, user) {
            //如果发生了错误,跳转回首页
            if (err) {
                console.log('error');
                return res.status(200).json({message:"error"});
            }
            //如果存在重复的用户名
            if (user) {
                return res.status(200).json({message:"用户名已存在"});
            }
            //正确情况下
            newUser.save(function (err, user) {
                if (err) {
                    req.flash('error', err);
                }
                //用户信息存入session
                req.session.user = newUser;
                //console.log(req.session.user);
                //req.flash('success', '注册成功');
                res.status(200).json({message:"success"})

            })
        })
    })
    //登录
    app.get('/login', checkNotLogin);
    app.get('/login', function (req, res) {
        res.render('login', {
            title: '登录',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString(),
            name:req.session.user?req.session.user.name:"i博客",
            touxiang:req.session.user?req.session.user.touxiang:"moren.jpg"
        })
    })
    //登录行为
    app.post('/login', checkNotLogin);
    app.post('/login', function (req, res) {
        //1.检查下用户名有没有
        //2.检查下密码对不对
        //3.存储到session中用户的登录信息
        //4.跳转到首页

        var md5 = crypto.createHash('md5');
        var password = md5.update(req.body.password).digest('hex');
        User.get(req.body.name, function (err, user) {
            if (req.body.name == '' || password == '') {
                return res.status(200).json({message:"请正确填写信息"});
            }
            if (!user) {
                //说明用户名不存在
                return res.status(200).json({message:"用户名不存在"});
            }
            //检查两次密码是否一样
            // console.log(password,"aaaaaaaaaaaaaaa");
            // console.log(user.password);
            if (user.password != password) {
                return res.status(200).json({message:"密码错误"});
            }

            req.session.user = user;
            //console.log(req.session.user);
            return res.status(200).json({message:"success"});
        })
    })
    //发表
    app.get('/post', checkLogin);
    app.get('/post', function (req, res) {
        res.render('post', {
            title: '发表',
            user: req.session.user,
            name:req.session.user?req.session.user.name:"i博客",
            touxiang:req.session.user?req.session.user.touxiang:"moren.jpg",
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        })
    })
    //发表行为
    app.post('/post', checkLogin);
    app.post('/post', function (req, res) {
       // console.log(req.body);
        //当前SESSION里面的用户信息
        // console.log(req.body.title);
        var currentUser = req.session.user;

        //判断一下内容不能为空
        if (req.body.title == '' || req.body.post == '') {
            return res.status(200).json({message:"内容不能为空"});
        }
        //添加一下标签信息
        var tags = [req.body.tag1, req.body.tag2, req.body.tag3];

        var post = new Post(currentUser.name, req.body.title, tags, req.body.post,"moren.jpg");
        post.save(function (err) {
            if (err) {
                return res.status(200).json({message:"保存出错"})
            }
            return res.status(200).json({message:"success"})
        })
    })
    //上传
    app.get('/upload', checkLogin);
    app.get('/upload', function (req, res) {
        res.render('upload', {
            title: '文件上传',
            user: req.session.user,
            name:req.session.user?req.session.user.name:"i博客",
            touxiang:req.session.user?req.session.user.touxiang:"moren.jpg",
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        })
    })
    //上传行为
    app.post('/upload', checkLogin);
    app.post('/upload', upload.array('field1', 5), function (req, res) {
        req.flash('success', '文件保存成功');
        res.redirect('/upload');
    });
    //文章浏览页面
    app.get("/article", function (req, res) {
        var page = parseInt(req.query.p) || 1;
        Post.getTen(null, page, function (err, posts, total) {
            if (err) {
                posts = [];
            }

            var names=[];
            var touxiangs=[];
            (function iterator(i) {
                if(i==posts.length){
                    res.render('article', {
                        title: '浏览文章',
                        user: req.session.user,
                        page: page,
                        name:req.session.user?req.session.user.name:"i博客",
                        touxiang:req.session.user?req.session.user.touxiang:"moren.jpg",
                        touxiangs:touxiangs,
                        posts: posts,
                        isFirstPage: (page - 1) == 0,
                        isLastPage: (page - 1) * 10 + posts.length == total,
                        success: req.flash('success').toString(),
                        error: req.flash('error').toString(),
                        color: ["label label-success", "label label-info", "label label-warning"]
                    })
                    console.log(touxiangs);
                    // return touxiangs;
                     return;
                }
                //可以用statSync进行同步的读文件 ，完全可以用for循环
                names.push(posts[i].name);
                User.get(names[i],function (err,user) {
                    touxiangs.push(user.touxiang);
                iterator(i+1)
                })

            })(0);
           // for(i=0;i<posts.length;i++){
           //     // console.log(posts[i].name);
           //     names.push(posts[i].name);
           //     User.get(names[i],function (err,user) {
           //         touxiangs.push(user.touxiang);
           //         // console.log(touxiangs);
           //         return touxiangs;
           //
           //     })
           //     if(i==posts.length){
           //         console.log(touxiangs,"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
           //     }
           // }
           // console.log(touxiangs,"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");


        })
    });

    //退出
    app.get('/logout', function (req, res) {
        //1.清除session
        //2.给用户提示
        //3.跳转到首页
        req.session.user = null;
        req.flash('success', '成功退出');
        res.redirect('/');
    })
    //点击用户名，可以看到用户发布的所有文章
    app.get('/u/:name', function (req, res) {
        var page = parseInt(req.query.p) || 1;
        //检查用户是否存在
        User.get(req.params.name, function (err, user) {
            if (err) {
                res.send(err);
                return
            }
            if (!user) {
                req.flash('error', '用户不存在!');
                return res.redirect('/');
            }
            //查询并返回该用户第 page 页的 10 篇文章
            Post.getTen(user.name, page, function (err, posts, total) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/');
                }
                res.render('user', {
                    title: user.name,
                    posts: posts,
                    page: page,
                    isFirstPage: (page - 1) == 0,
                    isLastPage: ((page - 1) * 10 + posts.length) == total,
                    user: req.session.user,
                    success: req.flash('success').toString(),
                    name:req.session.user?req.session.user.name:"i博客",
                    touxiang:req.session.user?req.session.user.touxiang:"moren.jpg",
                    error: req.flash('error').toString(),
                    color: ["label label-success", "label label-info", "label label-warning"]
                });
            });
        });
    });
    //文章详情页面
    app.get('/a/:name/:minute/:title', function (req, res) {
        Post.getOne(req.params.name, req.params.minute, req.params.title, function (err, post) {

            if (err) {
                req.flash('error', '找不到当前文章');
                return res.redirect('/');
            }
            console.log(req.session.user?req.session.user.name:"i博客","aaaaaa");
            res.render('details', {
                title: req.params.title,
                user: req.session.user,
                post: post,
                name:req.session.user?req.session.user.name:"i博客",
                touxiang:req.session.user?req.session.user.touxiang:"http://127.0.0.1:3000+moren.jpg",
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            })
        })
    })
    //文章的留言发布
    app.post('/a/:name/:minute/:title', function (req, res) {
        var date = new Date();
        var time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
            date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
        var comment = {
            name: req.body.name,
            time: time,
            content: req.body.content
        }
        var newCommnet = new Comment(req.params.name, req.params.minute, req.params.title, comment);
        newCommnet.save(function (err) {
            if (err) {
                return res.status(200).json({message:"error"})
            }
            return res.status(200).json({message:"success",comment:comment})

        })
    })
    //文章编辑
    app.get('/edit/:name/:minute/:title', checkLogin);
    app.get('/edit/:name/:minute/:title', function (req, res) {
        //获取到当前的用户
        var currentUser = req.session.user;
        Post.edit(currentUser.name, req.params.minute, req.params.title, function (err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            res.render('edit', {
                title: '编辑文章',
                user: req.session.user,
                post: post,
                name:req.session.user?req.session.user.name:"i博客",
                touxiang:req.session.user?req.session.user.touxiang:"moren.jpg",
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            })
        })
    })
    //文章编辑行为
    app.post('/edit/:name/:minute/:title', checkLogin);
    app.post('/edit/:name/:minute/:title', function (req, res) {
        Post.update(req.params.name, req.params.minute, req.params.title,
            req.body.post, function (err) {
                //encodeURI是防止有中文的情况下，对中文的字符进行转义
                var url = encodeURI('/a/' + req.params.name + '/' + req.params.minute + '/' + req.params.title);
                if (err) {
                    return res.status(200).json({message:"error"});
                }

               return res.status(200).json({message:"success"});
            })
    })
    //文章删除行为
    app.get('/remove/:name/:minute/:title', checkLogin);
    app.get('/remove/:name/:minute/:title', function (req, res) {
        Post.remove(req.params.name, req.params.minute, req.params.title, function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '修改成功');
            res.redirect('/');
        })
    })
    //文章存档
    app.get('/archive', function (req, res) {
        Post.getArchive(function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('archive', {
                title: '存档',
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString(),
                name:req.session.user?req.session.user.name:"i博客",
                touxiang:req.session.user?req.session.user.touxiang:"moren.jpg"
            })
        })
    })
    //文章标签页
    app.get('/tags', function (req, res) {
        Post.getTags(function (err, posts) {
            if (err) {
                req.flash('error', err);
                res.redirect('/');
            }
            res.render('tags', {
                title: '标签',
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString(),
                color: ["label label-success", "label label-info", "label label-warning"],
                name:req.session.user?req.session.user.name:"i博客",
                touxiang:req.session.user?req.session.user.touxiang:"moren.jpg"
            })
        })
    })
    //标签对应的文章集合
    app.get('/tags/:tag', function (req, res) {
        Post.getTag(req.params.tag, function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('tag', {
                title: 'TAG:' + req.params.tag,
                user: req.session.user,
                posts: posts,
                success: req.flash('success').toString(),
                error: req.flash('error').toString(),
                name:req.session.user?req.session.user.name:"i博客",
                touxiang:req.session.user?req.session.user.touxiang:"moren.jpg"
            })
        })
    })
    //搜索
    app.get('/search', function (req, res) {
        Post.search(req.query.keyword, function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('search', {
                title: 'SEARCH :' + req.query.keyword,
                user: req.session.user,
                posts: posts,
                name:req.session.user?req.session.user.name:"i博客",
                touxiang:req.session.user?req.session.user.touxiang:"moren.jpg",
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            })
        })
    })
//相册的列表
    app.get('/album', function (req, res, next) {
        album.getAllAlbums(function (err, allAlbums) {
            if (err) {
                next();
                return;
            }
            res.render("album", {
                title: "相册",
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString(),
                name:req.session.user?req.session.user.name:"i博客",
                touxiang:req.session.user?req.session.user.touxiang:"moren.jpg",
                albums: allAlbums
            })

        })
    })
    //获取相册的所有相片
    app.get('/:albumName', function (req, res, next) {
        var albumName = req.params.albumName;
        album.getAllImagesByAlbumName(albumName, function (err, allImages) {
            if (err) {
                next();
                return;
            }
            res.render('images', {
                title: "相片",
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString(),
                albumname: albumName,
                name:req.session.user?req.session.user.name:"i博客",
                touxiang:req.session.user?req.session.user.touxiang:"moren.jpg",
                images: allImages
            })

        })
    });
    app.get('/up', function (req, res, next) {
        album.getAllAlbums(function (err, albums) {
            if (err) {
                next();
                return
            }
            res.render("up", {
                title: "上传相片",
                name:req.session.user?req.session.user.name:"i博客",
                touxiang:req.session.user?req.session.user.touxiang:"moren.jpg",
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString(),
                albums: albums
            })
        })
    });

    //上传图片功能实现
    app.post("/up", function (req, res, next) {
        var form = new formidable.IncomingForm();
        form.uploadDir = __dirname + '/../tempup';
        form.parse(req, function (err, fields, files, next) {

            //
            if (err) {
                next();
                return;
            }
            var size = parseInt(files.tupian.size)
            // if (size > 1024) {
            //     res.send("图片尺寸应该小于1M");
            //     fs.unlink(files.tupian.path);
            // }
            //改变图片的name

            var ttt = sd.format(new Date(), "YYYYMMDDHHmmss")
            var ran = parseInt(Math.random() * 89999 + 10000);
            var extname = path.extname(files.tupian.name);
            //获取图片的路径
            var wenjianjia = fields.wenjianjia;
            var oldpath = files.tupian.path;
            var newpath = path.normalize(__dirname + "/../uploads/" + wenjianjia + '/' + ttt + ran + extname);
            fs.rename(oldpath, newpath, function (err) {
                if (err) {
                    next();
                    return;
                }
                res.redirect("/" + wenjianjia)

            })
        });
    });
//    头像上传路由,用户名修改
    app.get("/edituser",function (req,res) {
        res.render("edituser",{
            title: "修改个人资料",
            name:req.session.user?req.session.user.name:"i博客",
            touxiang:req.session.user?req.session.user.touxiang:"moren.jpg",
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString(),
            touxiangs:["1.jpg","2.jpg","3.jpg","4.jpg","5.jpg","6.jpg","7.jpg","8.jpg","9.jpg","10.jpg","11.jpg","12.jpg","13.jpg","14.jpg","15.jpg","16.jpg","17.jpg","18.jpg","19.jpg","20.jpg"]
        })

    })
    app.post("/edituser",function (req,res,next) {
        console.log(req.body)
        var md5 = crypto.createHash('md5');
        var password = md5.update(req.body.password).digest('hex');
        change.change("users",{"name":req.session.user.name},{$set:{name:req.body.name,password:password,touxiang:req.body.touxiang}},function (err,result) {
            if(err){
                next();
                return;
            }
            // console.log(result);
            req.session.user.name =req.body.name;
            req.session.user.touxiang=req.body.touxiang;
            return res.status(200).json({message:"success"})

        })



    })

};
