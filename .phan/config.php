<?php

$cfg = require __DIR__ . '/../vendor/mediawiki/mediawiki-phan-config/src/config.php';

$cfg['minimum_target_php_version'] = '8.1.0';

$cfg['directory_list'] = array_merge(
	$cfg['directory_list'],
	[
		'../../extensions/EventLogging',
		'../../extensions/Wikibase'
	]
);

$cfg['exclude_analysis_directory_list'] = array_merge(
	$cfg['exclude_analysis_directory_list'],
	[
		'../../extensions/EventLogging',
		'../../extensions/Wikibase'
	]
);

return $cfg;
