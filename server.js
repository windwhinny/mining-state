var express=require('express');
var config=require('./config');
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
app.listen(config.port);
console.log('Server start at port '+config.port);
