
exports.testFunc = function(req, rep, staticArgs) {
	rep.status(200).send('Test js script is running');
}