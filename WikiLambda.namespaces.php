<?php
/**
 * Translations of the namespaces introduced by WikiLambda.
 *
 * @file
 */

// Must be explicitly included for LocalisationCache to work on wiki farms
// (which loads i18n files, without initialising the extension per se).
require_once __DIR__ . '/includes/defines.php';

$namespaceNames = [];

/** English */
$namespaceNames['en'] = [
	NS_ZOBJECT => 'ZObject',
	NS_ZOBJECT_TALK => 'ZObject_talk',
];
