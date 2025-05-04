<?php
/**
 * 'Magic' translation file for the parser function introduced for Wikifunctions.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

$magicWords = [];

/** English (English) */
$magicWords['en'] = [
	// Our parser function, {{#function:…}}, for client mode.
	'function' => [ 0, 'function' ],

	// Our variable magic words, {{NUMBEROFFUNCTIONS}} etc., for repo mode.
	'magic_count_all' => [ 0, 'NUMBEROFOBJECTS' ],
	'magic_count_functions' => [ 0, 'NUMBEROFFUNCTIONS' ],
	'magic_count_implementations' => [ 0, 'NUMBEROFIMPLEMENTATIONS' ],
	'magic_count_testers' => [ 0, 'NUMBEROFTESTCASES' ],
	'magic_count_types' => [ 0, 'NUMBEROFTYPES' ],
	'magic_count_languages' => [ 0, 'NUMBEROFLANGUAGES' ],
];
