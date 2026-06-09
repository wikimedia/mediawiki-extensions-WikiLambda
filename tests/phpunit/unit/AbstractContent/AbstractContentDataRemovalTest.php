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

	public function testDoUpdate_setNewMetadata(): void {
		$mockTitle = $this->createMock( Title::class );
		$mockTitle->method( 'getDBkey' )->willReturn( 'Q319' );

		$mockArticleStore = $this->createMock( AWArticleStore::class );
		$mockArticleStore
			->method( 'getArticleMetadata' )
			->with( 'Q319' )
			->willReturn( null );

		$capturedMetadata = null;
		$mockArticleStore->expects( $this->once() )
			->method( 'setArticleMetadata' )
			->willReturnCallback( static function ( AWArticleMetadata $metadata ) use ( &$capturedMetadata ) {
				$capturedMetadata = $metadata;
				return true;
			} );

		$update = new AbstractContentDataRemoval( $mockTitle, $mockArticleStore );
		$update->doUpdate();

		$this->assertNotNull( $capturedMetadata );
		$payload = $capturedMetadata->getPayload();
		$this->assertSame( 'Q319', $capturedMetadata->getTopicQid() );
		$this->assertSame( self::NOW, $payload[ 'awDeleted' ] );
	}

	public function testDoUpdate_updateExistingMetadata(): void {
		$mockTitle = $this->createMock( Title::class );
		$mockTitle->method( 'getDBkey' )->willReturn( 'Q319' );

		$metadata = new AWArticleMetadata( 'Q319', [
			'someOtherKey' => 'should be kept',
		] );
		$mockArticleStore = $this->createMock( AWArticleStore::class );
		$mockArticleStore
			->method( 'getArticleMetadata' )
			->with( 'Q319' )
			->willReturn( $metadata );

		$capturedMetadata = null;
		$mockArticleStore->expects( $this->once() )
			->method( 'setArticleMetadata' )
			->willReturnCallback( static function ( AWArticleMetadata $metadata ) use ( &$capturedMetadata ) {
				$capturedMetadata = $metadata;
				return true;
			} );

		$update = new AbstractContentDataRemoval( $mockTitle, $mockArticleStore );
		$update->doUpdate();

		$this->assertNotNull( $capturedMetadata );
		$payload = $capturedMetadata->getPayload();
		$this->assertSame( 'Q319', $capturedMetadata->getTopicQid() );
		$this->assertSame( self::NOW, $payload[ 'awDeleted' ] );
		// Make sure this doesn't overwritte additional keys
		$this->assertSame( 'should be kept', $payload[ 'someOtherKey' ] );
	}
}
