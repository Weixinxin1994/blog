var mongo = require('./db');
//首先应该先连接数据库，然手找到user集合，之后找到对应的用户，对其信息进行修改
exports.change=function (collectionName, json1, json2, callback) {
    mongo.open(function (err,db) {
        if(err){
            return callback(err);
        }
        db.collection(collectionName,function (err,collection) {
            if(err){
                mongo.close();
                return callback(err);
            }
            collection.update(json1, json2,function (err,result) {
                if (err){
                    mongo.close();
                return callback(err);
                }
                console.log("aaaaaaaaaaaaaaaaaaaaaaaaaa")
                callback(null,result);
            })


        })


    })

}