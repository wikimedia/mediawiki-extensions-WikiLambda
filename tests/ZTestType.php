<?php
/**
 * WikiLambda ZTestType
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;

class ZTestType extends ZObject {

	public const TEST_ZID = 'Z111';

	public const TEST_ENCODING = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z4",
		"Z4K1": "Z111",
		"Z4K2": [
			"Z3",
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z111K1",
				"Z3K3": {
					"Z1K1": "Z12",
					"Z12K1": [
						"Z11",
						{
							"Z1K1": "Z11",
							"Z11K1": "Z1002",
							"Z11K2": "Demonstration key"
						},
						{
							"Z1K1": "Z11",
							"Z11K1": "Z1004",
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
						"Z11",
						{
							"Z1K1": "Z11",
							"Z11K1": "Z1002",
							"Z11K2": "Other demonstration key"
						},
						{
							"Z1K1": "Z11",
							"Z11K1": "Z1004",
							"Z11K2": "Autre index pour démonstration"
						}
					]
				}
			}
		],
		"Z4K3": "Z111",
		"Z4K4": "Z111",
		"Z4K5": "Z111",
		"Z4K6": "Z111",
		"Z4K7": ["Z46", "Z111"],
		"Z4K8": ["Z64", "Z111"]
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1002",
				"Z11K2": "Demonstration type"
			},
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1004",
				"Z11K2": "Type pour démonstration"
			}
		]
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": [
			"Z31",
			{
				"Z1K1": "Z31",
				"Z31K1": "Z1002",
				"Z31K2": [
					"Z6",
					"Demonstration type alias",
					"Demonstration type second alias"
 				]
			},
			{
				"Z1K1": "Z31",
				"Z31K1": "Z1004",
				"Z31K2": [ "Z6", "Alias de type pour démonstration" ]
			}
		]
	},
	"Z2K5": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1002",
				"Z11K2": "Demonstration type short description"
			}
		]
	}
}
EOT;

	public const TEST_LABELIZED = <<<EOT
{
    "type": "Persistent object",
    "id": "Z0",
    "value": {
        "type": "Type",
        "identity": "Z111",
        "keys": [
						"Key",
            {
                "type": "Key",
                "value type": "String",
                "key id": "Z111K1",
                "label": {
                    "type": "Multilingual text",
                    "texts": [
												"Monolingual text",
                        {
                            "type": "Monolingual text",
                            "language": "English",
                            "text": "Demonstration key"
                        },
                        {
                            "type": "Monolingual text",
                            "language": "French",
                            "text": "Index pour démonstration"
                        }
                    ]
                }
            },
            {
                "type": "Key",
                "value type": "String",
                "key id": "Z111K2",
                "label": {
                    "type": "Multilingual text",
                    "texts": [
												"Monolingual text",
                        {
                            "type": "Monolingual text",
                            "language": "English",
                            "text": "Other demonstration key"
                        },
                        {
                            "type": "Monolingual text",
                            "language": "French",
                            "text": "Autre index pour démonstration"
                        }
                    ]
                }
            }
        ],
        "validator": "Z111",
		"equality": "Z111",
		"renderer": "Z111",
		"parser": "Z111",
        "type converters to code": [
            "Z46",
			"Z111"
        ],
        "type converters from code": [
            "Z64",
			"Z111"
        ]
    },
    "labels": {
        "type": "Multilingual text",
        "texts": [
						"Monolingual text",
            {
                "type": "Monolingual text",
                "language": "English",
                "text": "Demonstration type"
            },
            {
                "type": "Monolingual text",
                "language": "French",
                "text": "Type pour démonstration"
            }
        ]
    },
    "aliases": {
        "type": "Multilingual stringset",
        "stringset": [
						"Monolingual stringset",
            {
                "type": "Monolingual stringset",
                "language": "English",
								"stringset": [
										"String",
                    "Demonstration type alias",
                    "Demonstration type second alias"
                ]
            },
            {
                "type": "Monolingual stringset",
                "language": "French",
                "stringset": [
										"String",
                    "Alias de type pour démonstration"
                ]
            }
        ]
		},
    "short descriptions": {
        "type": "Multilingual text",
        "texts": [
						"Monolingual text",
            {
                "type": "Monolingual text",
                "language": "English",
                "text": "Demonstration type short description"
            }
        ]
    }
}
EOT;

	public const TEST_HTML_ESCAPE = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z4",
		"Z4K1": "Z111",
		"Z4K2": [
			"Z3",
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z111K1",
				"Z3K3": {
					"Z1K1": "Z12",
					"Z12K1": [
						"Z11",
						{
							"Z1K1": "Z11",
							"Z11K1": "Z1002",
							"Z11K2": "Demonstration key"
						},
						{
							"Z1K1": "Z11",
							"Z11K1": "Z1004",
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
						"Z11",
						{
							"Z1K1": "Z11",
							"Z11K1": "Z1002",
							"Z11K2": "Other demonstration key"
						},
						{
							"Z1K1": "Z11",
							"Z11K1": "Z1004",
							"Z11K2": "Autre index pour démonstration"
						}
					]
				}
			}
		],
		"Z4K3": "Z111"
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1002",
				"Z11K2": "<<<>>>"
			},
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1004",
				"Z11K2": "Type pour démonstration"
			}
		]
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": [
			"Z31",
			{
				"Z1K1": "Z31",
				"Z31K1": "Z1002",
				"Z31K2": [
					"Z6",
					"Demonstration type alias",
					"Demonstration type second alias"
					]
			},
			{
				"Z1K1": "Z31",
				"Z31K1": "Z1004",
				"Z31K2": [ "Z6", "Alias de type pour démonstration" ]
			}
		]
	},
	"Z2K5": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1002",
				"Z11K2": "Demonstration type short description"
			}
		]
	}
}
EOT;

	public const TEST_LANGS = [ 'en', 'fr' ];

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
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

	/**
	 * @inheritDoc
	 */
	public function __construct( $a = null, $b = null ) {
		$this->data[ 'Z111K1' ] = $a;
		$this->data[ 'Z111K2' ] = $b;
	}

	/**
	 * @inheritDoc
	 */
	public static function create( array $objectVars ): ZObject {
		if ( !array_key_exists( 'Z111K1', $objectVars ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_MISSING_KEY,
					[
						'data' => $objectVars,
						'keywordArgs' => [ 'missing' => 'Z111K1' ]
					]
				)
			);
		}
		if ( !array_key_exists( 'Z111K2', $objectVars ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_MISSING_KEY,
					[
						'data' => $objectVars,
						'keywordArgs' => [ 'missing' => 'Z111K2' ]
					]
				)
			);
		}
		return new ZTestType( $objectVars[ 'Z111K1' ], $objectVars[ 'Z111K2' ] );
	}

	/**
	 * @inheritDoc
	 */
	public function getZValue() {
		return [ $this->data[ 'Z111K1' ], $this->data[ 'Z111K2' ] ];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		return true;
	}
}
