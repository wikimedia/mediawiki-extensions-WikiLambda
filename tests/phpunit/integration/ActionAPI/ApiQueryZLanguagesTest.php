<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiQueryZLanguages
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiQueryGeneratorBase
 * @group API
 * @group Database
 */
class ApiQueryZLanguagesTest extends WikiLambdaApiTestCase {

	private const EN_ZID = 'Z1002';
	private const ES_ZID = 'Z1003';
	private const FR_ZID = 'Z1004';

	public function addDBDataOnce(): void {
		$langs = ZLangRegistry::singleton();
		// en is already registered in ZLangRegistry::initialize(); add es and fr
		$langs->register( self::ES_ZID, 'es' );
		$langs->register( self::FR_ZID, 'fr' );
	}

	public function testRequiresCodesParam(): void {
		$this->setExpectedApiException( [ 'apierror-missingparam', 'wikilambdaload_zlanguages_codes' ] );
		$this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zlanguages',
		] );
	}

	public function testSingleKnownCodeReturnsZid(): void {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zlanguages',
			'wikilambdaload_zlanguages_codes' => 'en',
		] );

		$items = $result[0]['query']['wikilambdaload_zlanguages'];
		$this->assertCount( 1, $items );
		$this->assertSame( 'en', $items[0]['code'] );
		$this->assertSame( self::EN_ZID, $items[0]['zid'] );
	}

	public function testMultipleKnownCodesReturnZids(): void {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zlanguages',
			'wikilambdaload_zlanguages_codes' => 'en|es|fr',
		] );

		$items = $result[0]['query']['wikilambdaload_zlanguages'];
		$this->assertCount( 3, $items );
		$this->assertSame( 'en', $items[0]['code'] );
		$this->assertSame( self::EN_ZID, $items[0]['zid'] );
		$this->assertSame( 'es', $items[1]['code'] );
		$this->assertSame( self::ES_ZID, $items[1]['zid'] );
		$this->assertSame( 'fr', $items[2]['code'] );
		$this->assertSame( self::FR_ZID, $items[2]['zid'] );
	}

	public function testUnknownCodeReturnsNullZid(): void {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zlanguages',
			'wikilambdaload_zlanguages_codes' => 'xx-nonexistent',
		] );

		$items = $result[0]['query']['wikilambdaload_zlanguages'];
		$this->assertCount( 1, $items );
		$this->assertSame( 'xx-nonexistent', $items[0]['code'] );
		$this->assertNull( $items[0]['zid'] );
	}

	public function testMixedKnownAndUnknownCodes(): void {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zlanguages',
			'wikilambdaload_zlanguages_codes' => 'en|unknown-lang|fr',
		] );

		$items = $result[0]['query']['wikilambdaload_zlanguages'];
		$this->assertCount( 3, $items );
		$this->assertSame( 'en', $items[0]['code'] );
		$this->assertSame( self::EN_ZID, $items[0]['zid'] );
		$this->assertSame( 'unknown-lang', $items[1]['code'] );
		$this->assertNull( $items[1]['zid'] );
		$this->assertSame( 'fr', $items[2]['code'] );
		$this->assertSame( self::FR_ZID, $items[2]['zid'] );
	}

	public function testWithLabelsIncludesLabelForKnownCode(): void {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zlanguages',
			'wikilambdaload_zlanguages_codes' => 'en',
			'wikilambdaload_zlanguages_withlabels' => 1,
		] );

		$items = $result[0]['query']['wikilambdaload_zlanguages'];
		$this->assertCount( 1, $items );
		$this->assertSame( 'en', $items[0]['code'] );
		$this->assertSame( self::EN_ZID, $items[0]['zid'] );
		$expectedLabel = WikiLambdaServices::getZObjectStore()->fetchZObjectLabel( self::EN_ZID, 'en' );
		$this->assertSame( $expectedLabel, $items[0]['label'] );
	}

	public function testWithLabelsReturnsNullLabelForUnknownCode(): void {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zlanguages',
			'wikilambdaload_zlanguages_codes' => 'xx-nonexistent',
			'wikilambdaload_zlanguages_withlabels' => 1,
		] );

		$items = $result[0]['query']['wikilambdaload_zlanguages'];
		$this->assertCount( 1, $items );
		$this->assertSame( 'xx-nonexistent', $items[0]['code'] );
		$this->assertNull( $items[0]['zid'] );
		$this->assertNull( $items[0]['label'] );
	}
}
