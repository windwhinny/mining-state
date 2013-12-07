var express=require('express');
var config=require('./config');
var request=require('request');
var MongoClient=require('mongodb').MongoClient;
var MongoServer=require('mongodb').Server;
var app=express();

// use some middleware
app.use(express.bodyParser());
app.use(express.compress());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.static('public'))

app.get('/',function(req,res,next){
  if(req.accepts('html')){
    res.sendfile('./public/index.html',function(err){
      next(err);
    })
  }else{
    next();
  }
})

var db=null;
var mongodbClient=new MongoClient(new MongoServer('localhost',27017));
function startServer(done){
	mongodbClient.open(function(err,mongodbClient){
    if(err)return done(err); 
		mongodbClient
			.db('mining')
			.collection('record', function(err, collection) {
				db=collection;
				if(!db){
					return done(new Error('can not connect to database'));
				}
        startFetch();
			});
	})
	app.listen(config.port);
	console.log('Server start at port '+config.port);
}
var addToSaveQuery=(function(){
	var query=[];
	var queuing=false;
	function startQueuing(){
		if(queuing)return;
		queuing=true;
		function next(){
			if(query.length){
				var task=query.shift();
				task.beforeSave(task.data,function(err,data){
					if(err){
						throw err;
						return
					}
					task.data=data;
					db.save(task.data,function(err,doc){
            queuing=false;
            next();
            task.done(err,doc);
          });
				})
				next();
			}
		}
		next();
	}
	return function(data,beforeSave,done){
		data.date=Date();
		query.push({
			data:data,
			beforeSave:beforeSave,
			done:done
		});
		startQueuing();
	}
})();
function saveRecord(data){
  data.confirmed_reward=Number(data.confirmed_reward);
  data.unconfirm_reward=Number(data.unconfirm_reward);
	var totaleReward=data.confirmed_reward+data.unconfirm_reward;
	data.total_reward=totaleReward;
	addToSaveQuery(data,function(data,done){
		db.findOne({},{
			limit:1,
			sort:['date']
		},function(err,doc){
			if(err)return done(err);
      data.new_reward=data.total_reward-(doc?doc.total_reward:0);

      var workers=data.workers;
      data.workers=[];
      for(var i in workers){
        var worker=workers[i];
        worker.name=i;
        data.workers.push(worker);
      }
			done(err,data);
		})
	},function(err,data){
		if(err){
			throw err;
			return;
		}
	})
}
function startFetch(){
	setInterval(function() {
		var url='http://bbq.ltcoin.net/api.php?key=966989b42b5cbe8378e9e50c6500710c';
		request(url,function(err,res,data){
			if(err){
				throw err;
				return;
			}
			try{
				var data=JSON.parse(data);
				saveRecord(data);
			}catch (err){
				throw err;
				return
			}
		})
	},config.frequency);
}

startServer(function(err){
	if(err){
		console.error(err);
	}
  process.exit();
});

