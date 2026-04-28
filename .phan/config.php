<?php

$cfg = require __DIR__ . '/../vendor/mediawiki/mediawiki-phan-config/src/config.php';

$pathMediaWiki = getenv( 'MW_INSTALL_PATH' );
if ( $pathMediaWiki === false ) {
	$pathMediaWiki = '../..';
}

$cfg['autoload_internal_extension_signatures'] = [
	'memcached' => $pathMediaWiki . '/.phan/internal_stubs/memcached.phan_php',
];

$cfg['directory_list'] = array_merge(
	$cfg['directory_list'],
	[
		'../../extensions/CommunityConfiguration',
		'../../extensions/SiteMatrix',
		'../../extensions/Wikibase',
		'../../extensions/TestKitchen'
	]
);

$cfg['exclude_analysis_directory_list'] = array_merge(
	$cfg['exclude_analysis_directory_list'],
	[
		'../../extensions/CommunityConfiguration',
		'../../extensions/SiteMatrix',
		'../../extensions/Wikibase',
		'../../extensions/TestKitchen'
	]
);

return $cfg;
