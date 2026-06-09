<?php
/**
 * WikiLambda test suite for the AbstractContentDataUpdate class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
namespace MediaWiki\Extension\WikiLambda\Tests\Unit\AbstractContent;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentDataUpdate;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleMetadata;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Title\Title;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentDataUpdate
 */
class AbstractContentDataUpdateTest extends MediaWikiUnitTestCase {

	public function testDoUpdate_setNewMetadata(): void {
		$mockTitle = $this->createMock( Title::class );
		$mockTitle->method( 'getDBkey' )->willReturn( 'Q319' );
		$mockTitle->method( 'getTouched' )->willReturn( '20260531040500' );
		$mockTitle->method( 'getLatestRevID' )->willReturn( 12345 );

		$awContent = new AbstractWikiContent(
			'{"qid":"Q319","sections":{ '
			. '"Q101":{"index":0,"fragments":["Z89"]},'
			. '"Q102":{"index":1,"fragments":["Z89"]}}}'
		);

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

		$update = new AbstractContentDataUpdate( $mockTitle, $awContent, $mockArticleStore );
		$update->doUpdate();

		$this->assertNotNull( $capturedMetadata );
		$payload = $capturedMetadata->getPayload();
		$this->assertSame( 'Q319', $capturedMetadata->getTopicQid() );
		$this->assertSame( [ 0 => 'Q101', 1 => 'Q102' ], $payload['sections'] );
		$this->assertSame( '12345', $payload[ 'awLatestRevID' ] );
		$this->assertSame( '20260531040500', $payload[ 'awLastUpdated' ] );
	}

	public function testDoUpdate_updateExistingMetadata(): void {
		$mockTitle = $this->createMock( Title::class );
		$mockTitle->method( 'getDBkey' )->willReturn( 'Q319' );
		$mockTitle->method( 'getTouched' )->willReturn( '20260531040500' );
		$mockTitle->method( 'getLatestRevID' )->willReturn( 12345 );

		$awContent = new AbstractWikiContent(
			'{"qid":"Q319","sections":{ '
			. '"Q101":{"index":0,"fragments":["Z89"]},'
			. '"Q102":{"index":1,"fragments":["Z89"]}}}'
		);

		$metadata = new AWArticleMetadata( 'Q319', [
			'sections' => [ 'Q102' ],
			'someOtherKey' => 'should be kept',
			'awLatestRevID' => '1',
			'awLastUpdated' => '20250101010100',
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

		$update = new AbstractContentDataUpdate( $mockTitle, $awContent, $mockArticleStore );
		$update->doUpdate();

		$this->assertNotNull( $capturedMetadata );
		$payload = $capturedMetadata->getPayload();
		$this->assertSame( 'Q319', $capturedMetadata->getTopicQid() );
		$this->assertSame( [ 0 => 'Q101', 1 => 'Q102' ], $payload['sections'] );
		$this->assertSame( '12345', $payload[ 'awLatestRevID' ] );
		$this->assertSame( '20260531040500', $payload[ 'awLastUpdated' ] );
		// Make sure this doesn't overwritte additional keys
		$this->assertSame( 'should be kept', $payload[ 'someOtherKey' ] );
	}
}
