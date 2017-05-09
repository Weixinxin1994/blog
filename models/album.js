var fs = require("fs");
exports.getAllAlbums =function (callback) {
    //我们现在集中精力找到文件夹
    fs.readdir("./uploads", function (err, files) {
        if(err){
            callback("没有这个文件夹",null);
            return;
        }
        var allAlbums = [];
        (function iterator(i) {
            if(i==files.length){
                console.log(allAlbums);
                callback(null,allAlbums) ;
                return
            }
            //可以用statSync进行同步的读文件 ，完全可以用for循环
            fs.stat("./uploads/" + files[i], function (err, stats) {
                if(stats.isDirectory()){
                    allAlbums.push(files[i]);
                }
                iterator(i+1)
            });
        })(0);
        // console.log(files);
    });
    // return ["小猫", "小狗"]
};
exports.getAllImagesByAlbumName=function (albumName,callback) {
    fs.readdir("./uploads/"+albumName, function (err,files) {
        if(err){
            callback("没有这个文件夹",null);
            return;
        }
        var allImages = [];
        (function iterator(i) {
            if(i==files.length){
                console.log(allImages);
                callback(null,allImages) ;
                return;
            }
            //可以用statSync进行同步的读文件 ，完全可以用for循环
            fs.stat("./uploads/" +albumName+'/'+files[i], function (err, stats) {
                if(stats.isFile()){
                    allImages.push(files[i]);
                }
                iterator(i+1);
            });
        })(0);
        // console.log(files);
    })

};
