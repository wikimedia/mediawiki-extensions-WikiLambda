<?php

/**
 * WikiLambda integration test suite for hooks
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use DeferredUpdates;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\MediaWikiServices;
use Title;
use WikiPage;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\Hooks
 * @group Database
 */
class HooksTest extends \MediaWikiIntegrationTestCase {

	private $titlesTouched = [];

	protected function setUp() : void {
		parent::setUp();

		$firstTitleText = ZTestType::TEST_ZID;
		$firstTitle = Title::newFromText( $firstTitleText, NS_ZOBJECT );
		$this->titlesTouched[] = $firstTitleText;

		$this->hideDeprecated( '::create' );
		$initialStatus = $this->editPage( $firstTitleText, ZTestType::TEST_ENCODING, 'Test creation', NS_ZOBJECT );
	}

	/**
	 * @covers ::onMultiContentSave
	 */
	public function testOnMultiContentSave_badTitle() {
		$invalidTitleText = 'Bad page title';

		$invalidZIDStatus = $this->editPage(
			$invalidTitleText, ZTestType::TEST_ENCODING, 'Test bad title', NS_ZOBJECT
		);

		$this->assertFalse( $invalidZIDStatus->isOK() );
		$this->assertTrue( $invalidZIDStatus->hasMessage( 'wikilambda-invalidzobjecttitle' ) );

		$invalidTitle = Title::newFromText( $invalidTitleText, NS_ZOBJECT );
		$this->assertFalse( $invalidTitle->exists() );
	}

	/**
	 * @covers ::onMultiContentSave
	 */
	public function testOnMultiContentSave_badContent() {
		$invalidContent = '{"Z1K1": "Z6", "Z6K1": "a T263956 string!"}';

		$invalidZIDStatus = $this->editPage(
			ZTestType::TEST_ZID, $invalidContent, 'Test bad content', NS_ZOBJECT
		);

		$this->assertFalse( $invalidZIDStatus->isOK() );
		$this->assertTrue( $invalidZIDStatus->hasMessage( 'wikilambda-invalidzobject' ) );
	}

	/**
	 * @covers ::onMultiContentSave
	 */
	public function testOnMultiContentSave_nullEdit() {
		$nullEditStatus = $this->editPage( ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'No-op edit', NS_ZOBJECT );
		$this->assertTrue( $nullEditStatus->isOK() );
		$this->assertTrue( $nullEditStatus->hasMessage( 'edit-no-change' ) );
	}

	/**
	 * @covers ::onMultiContentSave
	 */
	public function testOnMultiContentSave_clashingLabels_caught() {
		$secondTitleText = ZTestType::TEST_ZID . '0';
		$secondTitle = Title::newFromText( $secondTitleText, NS_ZOBJECT );

		// Force deferred updates from other edits (in this case, the one in setUp()) so we can
		// conflict with it.
		DeferredUpdates::doUpdates();
		MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->waitForReplication();
		$this->assertSame( [], DeferredUpdates::getPendingUpdates() );

		$this->assertFalse( $secondTitle->exists() );

		$this->titlesTouched[] = $secondTitleText;
		$dupeEditStatus = $this->editPage(
			$secondTitleText, ZTestType::TEST_ENCODING, 'Duplicate creation (blocked)', NS_ZOBJECT
		);
		$this->assertFalse( $dupeEditStatus->isOK() );
		$this->assertTrue( $dupeEditStatus->hasMessage( 'wikilambda-labelclash' ) );

		$only_our_errors = function ( $item ) {
			return $item[0] === 'wikilambda-labelclash';
		};
		$filteredErrors = array_filter( $dupeEditStatus->getErrorsArray(), $only_our_errors );

		$this->assertCount( 2, $filteredErrors );

		// Force re-check so it re-fetches from the DB.
		$this->assertFalse( $secondTitle->exists( Title::READ_LATEST ) );
	}

	// TODO: Test the uncaught behaviour of MultiContentSave when a a clash happens too late for us to stop it.

	protected function tearDown() : void {
		// Cleanup the pages we touched.
		$sysopUser = $this->getTestSysop()->getUser();

		foreach ( $this->titlesTouched as $titleString ) {
			$title = Title::newFromText( $titleString, NS_ZOBJECT );
			$page = WikiPage::factory( $title );
			$page->doDeleteArticleReal( $title, $sysopUser );
		}

		parent::tearDown();
	}

}
