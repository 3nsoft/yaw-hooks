/*
 Copyright (C) 2019 3NSoft Inc.
 */

// NOTE: due to bad definition file, typescript below is not very type-strict.

const jas = new (require('jasmine'))();

jas.loadConfig({
	spec_dir: 'build/tests',
	spec_files: [
		'specs/*.js',
	]
});

jas.configureDefaultReporter({
	showColors: true
})

jas.execute();
