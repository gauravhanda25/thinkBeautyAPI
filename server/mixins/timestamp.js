module.exports = function(Model, options) {
  // Model is the model class
  // options is an object containing the config properties from model definition
  for(x in options) {
  	Model.defineProperty(x, options[x]);	
  }
  
  //Model.defineProperty('modified', {type: Date, default: '$now'});
}