<?php

use MediaWiki\MediaWikiServices;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\API\ApiZObjectFetcher
 * @group Database
 * @group API
 * @group WikiLambda
 * @group medium
 */
class ApiZObjectFetcherTest extends ApiTestCase {

	/** @var string[] */
	protected $titlesTouched = [];

	protected function setUp() : void {
		parent::setUp();

		$this->tablesUsed[] = 'wikilambda_zobject_labels';
		$this->tablesUsed[] = 'wikilambda_zobject_label_conflicts';
	}

	protected function tearDown() : void {
		$sysopUser = $this->getTestSysop()->getUser();

		foreach ( $this->titlesTouched as $titleString ) {
			$title = Title::newFromText( $titleString, NS_ZOBJECT );
			$page = WikiPage::factory( $title );
			if ( $page->exists() ) {
				$page->doDeleteArticleReal( "clean slate for testing", $sysopUser );
			}
		}

		parent::tearDown();
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectFetcher::execute
	 */
	public function testFailsWithoutTitle() {
		$unnamable = 'nope; can\'t name it';
		$this->assertFalse(
			Title::newFromText( $unnamable, NS_ZOBJECT )->exists(),
			'no title should exist for the string "' . $unnamable . '"' );

		$this->setExpectedApiException( [ 'apierror-wikilambda_fetch-missingzid', $unnamable ] );

		$this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => $unnamable,
			'language' => 'en',
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectFetcher::execute
	 */
	public function testFailsWithEmptyZid() {
		$this->setExpectedApiException( [ 'apierror-wikilambda_fetch-missingzid', '' ] );
		$this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => '|',
			'language' => 'en',
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectFetcher::execute
	 */
	public function testSucceedsWithValidZids() {
		// Insert necessary ZIDs
		$files = [ 'Z1' => 'Z1.json', 'Z2' => 'Z2.json' ];
		$dataPath = dirname( __DIR__, 4 ) . '/data/';
		foreach ( $files as $zid => $filename ) {
			$data = file_get_contents( $dataPath . $filename );
			$this->editPage( $zid, $data, 'Test creation', NS_ZOBJECT );
			$this->titlesTouched[] = $zid;
		}

		DeferredUpdates::doUpdates();
		MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->waitForReplication();
		$result = $this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => 'z1|z2',
			'language' => 'en',
		] );

		$z1_object = <<<EOF
{
    "Z1K1": "Z2",
    "Z2K1": "Z1",
    "Z2K2": {
        "Z1K1": "Z4",
        "Z4K1": "Z1",
        "Z4K2": [
            {
                "Z1K1": "Z3",
                "Z3K1": "Z4",
                "Z3K2": "Z1K1",
                "Z3K3": {
                    "Z1K1": "Z12",
                    "Z12K1": [
                        {
                            "Z1K1": "Z11",
                            "Z11K1": "Z1002",
                            "Z11K2": "type"
                        }
                    ]
                }
            }
        ],
        "Z4K3": "Z101"
    },
    "Z2K3": {
        "Z1K1": "Z12",
        "Z12K1": [
            {
                "Z1K1": "Z11",
                "Z11K1": "Z1002",
                "Z11K2": "Object"
            }
        ]
    }
}
EOF;

		$z2_object = <<<EOF
{
    "Z1K1": "Z2",
    "Z2K1": "Z2",
    "Z2K2": {
        "Z1K1": "Z4",
        "Z4K1": "Z2",
        "Z4K2": [
            {
                "Z1K1": "Z3",
                "Z3K1": "Z6",
                "Z3K2": "Z2K1",
                "Z3K3": {
                    "Z1K1": "Z12",
                    "Z12K1": [
                        {
                            "Z1K1": "Z11",
                            "Z11K1": "Z1002",
                            "Z11K2": "id"
                        }
                    ]
                }
            },
            {
                "Z1K1": "Z3",
                "Z3K1": "Z1",
                "Z3K2": "Z2K2",
                "Z3K3": {
                    "Z1K1": "Z12",
                    "Z12K1": [
                        {
                            "Z1K1": "Z11",
                            "Z11K1": "Z1002",
                            "Z11K2": "value"
                        }
                    ]
                }
            },
            {
                "Z1K1": "Z3",
                "Z3K1": "Z12",
                "Z3K2": "Z2K3",
                "Z3K3": {
                    "Z1K1": "Z12",
                    "Z12K1": [
                        {
                            "Z1K1": "Z11",
                            "Z11K1": "Z1002",
                            "Z11K2": "label"
                        }
                    ]
                }
            }
        ],
        "Z4K3": "Z102"
    },
    "Z2K3": {
        "Z1K1": "Z12",
        "Z12K1": [
            {
                "Z1K1": "Z11",
                "Z11K1": "Z1002",
                "Z11K2": "Persistent object"
            }
        ]
    }
}
EOF;

		$this->assertEquals( $z1_object, $result[0]["z1"]["wikilambda_fetch"] );
		$this->assertEquals( $z2_object, $result[0]["z2"]["wikilambda_fetch"] );
	}

}
