<?php
/**
 * WikiLambda test suite for the AbstractContentDataRemoval class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
namespace MediaWiki\Extension\WikiLambda\Tests\Unit\AbstractContent;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentDataRemoval;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleMetadata;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Title\Title;
use MediaWikiUnitTestCase;
use Wikimedia\Timestamp\ConvertibleTimestamp;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentDataRemoval
 */
class AbstractContentDataRemovalTest extends MediaWikiUnitTestCase {

	private const TEST_ABSTRACT_NS = 2300;
	private const NOW = '20260531040500';

	protected function setUp(): void {
		parent::setUp();
		ConvertibleTimestamp::setFakeTime( self::NOW );
	}

	protected function tearDown(): void {
		ConvertibleTimestamp::setFakeTime( false );
		parent::tearDown();
	}

	private function makeMockTitle( string $qid ): Title {
		$mockTitle = $this->createMock( Title::class );
		$mockTitle->method( 'getDBkey' )->willReturn( $qid );
		return $mockTitle;
	}

	public function testDoUpdate_noMetadata_doesNothing(): void {
		$mockArticleStore = $this->createMock( AWArticleStore::class );
		$mockArticleStore
			->method( 'getArticleMetadata' )
			->with( 'Q319' )
			->willReturn( null );

		$mockArticleStore->expects( $this->never() )->method( 'deleteSection' );
		$mockArticleStore->expects( $this->never() )->method( 'deleteArticleMetadata' );

		$update = new AbstractContentDataRemoval( $this->makeMockTitle( 'Q319' ), $mockArticleStore );
		$update->doUpdate();
	}

	public function testDoUpdate_deletesSections(): void {
		$metadata = new AWArticleMetadata( 'Q319', [
			'sections' => [ 'Q101', 'Q102' ],
			'renderedLangs' => [ 'en', 'es' ],
		] );

		$mockArticleStore = $this->createMock( AWArticleStore::class );
		$mockArticleStore
			->method( 'getArticleMetadata' )
			->with( 'Q319' )
			->willReturn( $metadata );

		$deletedSections = [];
		$mockArticleStore
			->method( 'deleteSection' )
			->willReturnCallback( static function ( $topicQid, $sectionQid, $locale ) use ( &$deletedSections ) {
				$deletedSections[] = [ $topicQid, $sectionQid, $locale ];
				return true;
			} );

		$update = new AbstractContentDataRemoval( $this->makeMockTitle( 'Q319' ), $mockArticleStore );
		$update->doUpdate();

		$this->assertCount( 4, $deletedSections );
		$this->assertContains( [ 'Q319', 'Q101', 'en' ], $deletedSections );
		$this->assertContains( [ 'Q319', 'Q101', 'es' ], $deletedSections );
		$this->assertContains( [ 'Q319', 'Q102', 'en' ], $deletedSections );
		$this->assertContains( [ 'Q319', 'Q102', 'es' ], $deletedSections );
	}

	public function testDoUpdate_deletesMetadata(): void {
		$metadata = new AWArticleMetadata( 'Q319', [
			'sections' => [ 'Q101' ],
			'renderedLangs' => [ 'en' ],
		] );

		$mockArticleStore = $this->createMock( AWArticleStore::class );
		$mockArticleStore
			->method( 'getArticleMetadata' )
			->with( 'Q319' )
			->willReturn( $metadata );

		$mockArticleStore->expects( $this->once() )
			->method( 'deleteArticleMetadata' )
			->with( 'Q319' );

		$update = new AbstractContentDataRemoval( $this->makeMockTitle( 'Q319' ), $mockArticleStore );
		$update->doUpdate();
	}

	public function testDoUpdate_noSections_deletesMetadata(): void {
		$metadata = new AWArticleMetadata( 'Q319', [
			'sections' => [],
			'renderedLangs' => [],
		] );

		$mockArticleStore = $this->createMock( AWArticleStore::class );
		$mockArticleStore
			->method( 'getArticleMetadata' )
			->with( 'Q319' )
			->willReturn( $metadata );

		$mockArticleStore->expects( $this->never() )->method( 'deleteSection' );
		$mockArticleStore->expects( $this->once() )->method( 'deleteArticleMetadata' )->with( 'Q319' );

		$update = new AbstractContentDataRemoval( $this->makeMockTitle( 'Q319' ), $mockArticleStore );
		$update->doUpdate();
	}
}
