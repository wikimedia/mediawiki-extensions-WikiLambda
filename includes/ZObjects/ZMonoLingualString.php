<?php
/**
 * WikiLambda ZMonoLingualString
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\ZTypeRegistry;

class ZMonoLingualString implements ZObject {

	/** @var array */
	private $data = [];

	public static function getDefinition() : array {
		return [
			'type' => 'ZMonoLingualString',
			'keys' => [
				ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => [
					'type' => ZTypeRegistry::HACK_LANGUAGE,
				],
				ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => [
					'type' => ZTypeRegistry::HACK_STRING,
				],
			],
		];
	}

	public function __construct( $langage = '', $value = '' ) {
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ] = $langage;
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ] = $value;
	}

	public function getZType() : string {
		return static::getDefinition()['type'];
	}

	public function getZValue() {
		return [ $this->getLanguage() => $this->getString() ];
	}

	public function getLanguage() {
		return $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ];
	}

	public function getString() {
		return $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ];
	}

	public function isValid() : bool {
		// TODO: Right now these are uneditable and guaranteed valid on creation, but when we
		// add model (API and UX) editing, this will need to actually evaluate.
		return true;
	}
}
