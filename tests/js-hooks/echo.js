
exports.echo = function(req, rep, staticArgs) {
	rep.status(200).send(req.body);
}