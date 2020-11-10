<?php
/**
 * WikiLambda ZTestType
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\ZObject;

class ZTestType implements ZObject {

	public const TEST_ZID = 'Z111';

	public const TEST_ENCODING = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z4",
		"Z4K1": "Z111",
		"Z4K2": [
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z111K1",
				"Z3K3": {
					"Z1K1": "Z12",
					"Z12K1": [
						{
							"Z1K1": "Z11",
							"Z11K1": "en",
							"Z11K2": "Demonstration key"
						},
						{
							"Z1K1": "Z11",
							"Z11K1": "fr",
							"Z11K2": "Index pour démonstration"
						}
					]
				}
			},
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z111K2",
				"Z3K3": {
					"Z1K1": "Z12",
					"Z12K1": [
						{
							"Z1K1": "Z11",
							"Z11K1": "en",
							"Z11K2": "Other demonstration key"
						},
						{
							"Z1K1": "Z11",
							"Z11K1": "fr",
							"Z11K2": "Autre index pour démonstration"
						}
					]
				}
			}
		],
		"Z4K3": "Z0"
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			{
				"Z1K1": "Z11",
				"Z11K1": "en",
				"Z11K2": "Demonstration type"
			},
			{
				"Z1K1": "Z11",
				"Z11K1": "fr",
				"Z11K2": "Type pour démonstration"
			}
		]
	}
}
EOT;

	/** @var array */
	private $data = [];

	public static function getDefinition() : array {
		return [
			'keys' => [
				'Z111K1' => [
					'type' => ZTypeRegistry::Z_OBJECT,
				],
				'Z111K2' => [
					'type' => ZTypeRegistry::Z_OBJECT,
				],
			],
		];
	}

	public function __construct( $a = null, $b = null ) {
		$this->data[ 'Z111K1' ] = $a;
		$this->data[ 'Z111K2' ] = $b;
	}

	public static function create( array $objectVars ) : ZObject {
		if ( !array_key_exists( 'Z111K1', $objectVars ) ) {
			throw new \InvalidArgumentException( "ZTestType missing the Z111K1 key." );
		}
		if ( !array_key_exists( 'Z111K2', $objectVars ) ) {
			throw new \InvalidArgumentException( "ZTestType missing the Z111K2 key." );
		}
		return new ZTestType( $objectVars[ 'Z111K1' ], $objectVars[ 'Z111K2' ] );
	}

	public function getZType() : string {
		return static::getDefinition()['type'];
	}

	public function getZValue() {
		return [ $this->data[ 'Z111K1' ], $this->data[ 'Z111K2' ] ];
	}

	public function isValid() : bool {
		return true;
	}
}
