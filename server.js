var express=require('express');
var config=require('config');
var app=express.app();

app.listen(config.port);
console.log('Server start at port '+config.port);
