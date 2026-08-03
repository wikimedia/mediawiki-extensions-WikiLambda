<?php

/**
 * WikiLambda unit test suite for the UIUtils file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Content\WikitextContent;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\UIUtils;
use MediaWiki\Html\Html;
use MediaWiki\Output\OutputPage;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\RevisionDelete\RevisionDeleter;
use MediaWiki\Tests\Unit\Permissions\MockAuthorityTrait;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\UIUtils
 * @group Database
 */
class UIUtilsTest extends WikiLambdaRepoModeIntegrationTestCase {

	use MockAuthorityTrait;

	public function testCreateCodexProgressIndicator() {
		$ariaLabel = 'Loading data';
		$actual = UIUtils::createCodexProgressIndicator( $ariaLabel );

		$this->assertIsString( $actual );
		$this->assertStringContainsString( 'cdx-progress-indicator', $actual );
		$this->assertStringContainsString( 'aria-label="' . $ariaLabel . '"', $actual );
		$this->assertStringContainsString( '<progress', $actual );
	}

	// ------------------------------------------------------------------
	// createErrorChip
	// ------------------------------------------------------------------

	public function testCreateErrorChip_containsChipClasses() {
		$result = UIUtils::createErrorChip( 'wikilambda-commons-image-error-invalid-mid' );
		$this->assertStringContainsString( 'cdx-info-chip', $result );
		$this->assertStringContainsString( 'cdx-info-chip--error', $result );
	}

	public function testCreateErrorChip_containsMessageText() {
		$result = UIUtils::createErrorChip( 'wikilambda-commons-image-error-invalid-mid' );
		$this->assertStringContainsString( 'Image M-ID', $result );
	}

	public function testCreateErrorChip_dataErrorKeyDefaultsToErrorKey() {
		$result = UIUtils::createErrorChip( 'wikilambda-commons-image-error-invalid-mid' );
		$this->assertStringContainsString(
			'data-error-key="wikilambda-commons-image-error-invalid-mid"',
			$result
		);
	}

	public function testCreateErrorChip_dataErrorKeyOverride() {
		$result = UIUtils::createErrorChip( 'wikilambda-commons-image-error-invalid-mid', 'custom-key' );
		$this->assertStringContainsString( 'data-error-key="custom-key"', $result );
	}

	public function testCreateErrorChip_noRawScriptTags() {
		$result = UIUtils::createErrorChip( 'wikilambda-commons-image-error-invalid-mid' );
		$this->assertStringNotContainsString( '<script>', $result );
	}

	// ------------------------------------------------------------------
	// checkRevisionViewable
	// ------------------------------------------------------------------

	/**
	 * Create a two-revision page and RevisionDelete the FIRST (non-current) revision.
	 *
	 * The helper under test is content-model agnostic, so this deliberately uses a plain
	 * wikitext page rather than a ZObject or Abstract page: it keeps the fixture free of
	 * ZObject validation and Wikidata mocking.
	 *
	 * RevisionDeleter::createList()->setVisibility() is used rather than a bare `revision`
	 * table UPDATE because it both writes rev_deleted and purges the RevisionStore/page
	 * caches, so a subsequent read sees the new visibility instead of a stale, still-
	 * viewable cached RevisionRecord.
	 *
	 * @param int[] $visibility Bitfield constants to set, e.g. [ RevisionRecord::DELETED_TEXT ]
	 * @return array{0:Title,1:RevisionRecord} [ $title, $hiddenRevision ]
	 */
	private function createPageWithHiddenFirstRevision( array $visibility ): array {
		$title = Title::newFromText( 'UIUtilsTest revision visibility', NS_HELP );
		$sysop = $this->getTestSysop()->getUser();

		$firstStatus = $this->editPage(
			$title, new WikitextContent( 'First revision' ), 'First', NS_HELP, $sysop
		);
		$this->assertStatusOK( $firstStatus );
		$hiddenRevId = $firstStatus->getNewRevision()->getId();

		// A second revision, so the hidden one is not the current revision.
		$this->assertStatusOK( $this->editPage(
			$title, new WikitextContent( 'Second revision' ), 'Second', NS_HELP, $sysop
		) );

		$context = RequestContext::getMain();
		$context->setUser( $sysop );
		$deleter = RevisionDeleter::createList( 'revision', $context, $title, [ $hiddenRevId ] );
		$this->assertStatusOK( $deleter->setVisibility( [
			'value' => array_fill_keys( $visibility, 1 ),
			'comment' => 'Testing revision visibility',
		] ) );
		$this->runDeferredUpdates();

		$revision = $this->getServiceContainer()->getRevisionStore()->getRevisionById( $hiddenRevId );

		return [ $title, $revision ];
	}

	public function testCheckRevisionViewable_trueForPrivilegedPerformer() {
		[ $title, $revision ] = $this->createPageWithHiddenFirstRevision(
			[ RevisionRecord::DELETED_TEXT ]
		);
		$output = new OutputPage( new RequestContext() );

		$result = UIUtils::checkRevisionViewable(
			$revision, $this->mockRegisteredUltimateAuthority(), $title, $output
		);

		$this->assertTrue( $result );
		// Nothing should have been written to the output for a viewable revision.
		$this->assertSame( '', $output->getHTML() );
		$this->assertNotContains( 'mediawiki.codex.messagebox.styles', $output->getModuleStyles() );
	}

	public function testCheckRevisionViewable_deletedErrorForUnprivilegedPerformer() {
		[ $title, $revision ] = $this->createPageWithHiddenFirstRevision(
			[ RevisionRecord::DELETED_TEXT ]
		);
		$output = new OutputPage( new RequestContext() );

		$result = UIUtils::checkRevisionViewable(
			$revision, $this->mockRegisteredNullAuthority(), $title, $output
		);

		$this->assertFalse( $result );
		// Plain DELETED_TEXT (not DELETED_RESTRICTED) → rev-deleted-text-permission path.
		$expected = Html::errorBox(
			$output->msg( 'rev-deleted-text-permission', $title->getPrefixedDBkey() )->parse()
		);
		$this->assertSame( $expected, $output->getHTML() );
	}

	public function testCheckRevisionViewable_suppressedErrorWhenRestricted() {
		[ $title, $revision ] = $this->createPageWithHiddenFirstRevision(
			[ RevisionRecord::DELETED_TEXT, RevisionRecord::DELETED_RESTRICTED ]
		);
		$output = new OutputPage( new RequestContext() );

		$result = UIUtils::checkRevisionViewable(
			$revision, $this->mockRegisteredNullAuthority(), $title, $output
		);

		$this->assertFalse( $result );
		// DELETED_RESTRICTED set → rev-suppressed-text path.
		$expected = Html::errorBox( $output->msg( 'rev-suppressed-text' )->parse() );
		$this->assertSame( $expected, $output->getHTML() );
	}

	/**
	 * The error box is Codex-styled, and the callers that emit it return immediately
	 * afterwards without rendering anything else, so the styles must come from here.
	 */
	public function testCheckRevisionViewable_addsMessageBoxStyles() {
		[ $title, $revision ] = $this->createPageWithHiddenFirstRevision(
			[ RevisionRecord::DELETED_TEXT ]
		);
		$output = new OutputPage( new RequestContext() );

		UIUtils::checkRevisionViewable(
			$revision, $this->mockRegisteredNullAuthority(), $title, $output
		);

		$this->assertContains( 'mediawiki.codex.messagebox.styles', $output->getModuleStyles() );
	}
}
