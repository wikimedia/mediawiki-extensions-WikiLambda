<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\ActionAPI\ApiQueryZObjects;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContentHandler;
use MediaWiki\Title\Title;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiQueryZObjects
 * @group Database
 * @group API
 */
class ApiQueryZObjectsTest extends WikiLambdaApiTestCase {

	/**
	 * @var string
	 */
	private $unavailableZid = 'Z123456789';

	/**
	 * @var string
	 */
	private $notValidZid = 'NotValidZid';

	private const EN = 'Z1002';
	private const FR = 'Z1004';

	private static function getTestFileContents( $fileName ): string {
		$path = dirname( __DIR__, 2 ) . '/test_data/' . $fileName;
		return file_get_contents( $path );
	}

	public function addDBDataOnce() {
		// Register necessary languages
		$langs = ZLangRegistry::singleton();
		$langs->register( self::EN, 'en' );
		$langs->register( self::FR, 'fr' );

		$this->insertBuiltinObjects( [ 'Z60', 'Z1002', 'Z1004' ] );

		// Add ZTypeTest multilingual object (Z111)
		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );
		$baseObject = ZTestType::TEST_ENCODING;
		$page = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $title );
		$content = ZObjectContentHandler::makeContent( $baseObject, $title );

		$status = $page->doUserEditContent(
			$content,
			$this->getTestSysop()->getUser(),
			"Test creation object"
		);
		$page->clear();
	}

	public function testNotFound() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => $this->unavailableZid
		] );

		$zObjects = $result[0]['query']['wikilambdaload_zobjects'];

		$this->assertCount( 1, $zObjects );
		$this->assertFalse( $zObjects[$this->unavailableZid]['success'] );
	}

	public function testNotValidZid() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => $this->notValidZid
		] );

		$zObjects = $result[0]['query']['wikilambdaload_zobjects'];

		$this->assertCount( 1, $zObjects );
		$this->assertFalse( $zObjects[$this->notValidZid]['success'] );
	}

	public function testMultipleZidsOneNotFound() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => "$this->unavailableZid|Z111",
		] );

		$zObjects = $result[0]['query']['wikilambdaload_zobjects'];

		$this->assertCount( 2, $zObjects );
		$this->assertFalse( $zObjects[$this->unavailableZid]['success'] );
		$this->assertTrue( $zObjects['Z111']['success'] );
	}

	public function testMultipleZidsOneNotValid() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => "Z111|$this->notValidZid",
		] );

		$zObjects = $result[0]['query']['wikilambdaload_zobjects'];

		$this->assertCount( 2, $zObjects );
		$this->assertFalse( $zObjects[$this->notValidZid]['success'] );
		$this->assertTrue( $zObjects['Z111']['success'] );
	}

	public function testMultipleZidsErrors() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => "Z111|$this->notValidZid|$this->unavailableZid",
		] );

		$zObjects = $result[0]['query']['wikilambdaload_zobjects'];

		$this->assertCount( 3, $zObjects );
		$this->assertFalse( $zObjects[$this->notValidZid]['success'] );
		$this->assertFalse( $zObjects[$this->unavailableZid]['success'] );
		$this->assertTrue( $zObjects['Z111']['success'] );
	}

	public function testNoLanguageFilter() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z111',
		] );

		$z111 = $result[0]['query']['wikilambdaload_zobjects']['Z111']['data'];
		$keys = $z111['Z2K2']['Z4K2'];
		$labels = $z111['Z2K3']['Z12K1'];

		// Remove type element
		array_shift( $keys );
		array_shift( $labels );

		$this->assertCount( 2, $labels );

		foreach ( $keys as $key ) {
			$this->assertCount( 3, $key['Z3K3']['Z12K1'] );
		}
	}

	public function testAvailableLanguage() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z111',
			'wikilambdaload_language' => 'fr',
		] );

		$z111 = $result[0]['query']['wikilambdaload_zobjects']['Z111']['data'];
		$keys = $z111['Z2K2']['Z4K2'];
		$labels = $z111['Z2K3']['Z12K1'];

		// Remove type element
		array_shift( $keys );
		array_shift( $labels );

		$this->assertCount( 1, $labels );
		$this->assertEquals( self::FR, $labels[0]['Z11K1'] );

		foreach ( $keys as $key ) {
			$this->assertCount( 2, $key['Z3K3']['Z12K1'] );
			$this->assertEquals( self::FR, $key['Z3K3']['Z12K1'][1]['Z11K1'] );
		}
	}

	public function testUnavailableLanguage() {
		// Note that unlike the Invalid test below, this langugage is in the database, but not in the
		// language cache, which shouldn't ever happen

		$this->insertBuiltinObjects( [ 'Z1003' ] );

		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z111',
			'wikilambdaload_language' => 'es',
		] );

		$z111 = $result[0]['query']['wikilambdaload_zobjects']['Z111']['data'];
		$keys = $z111['Z2K2']['Z4K2'];
		$labels = $z111['Z2K3']['Z12K1'];

		// Remove type element
		array_shift( $keys );
		array_shift( $labels );

		$this->assertCount( 1, $labels );
		$this->assertEquals( self::EN, $labels[0]['Z11K1'] );

		foreach ( $keys as $key ) {
			$this->assertCount( 2, $key['Z3K3']['Z12K1'] );
			$this->assertEquals( self::EN, $key['Z3K3']['Z12K1'][1]['Z11K1'] );
		}
	}

	public function testInvalidLanguage() {
		$badLanguageCode = 'thisisnotalanguagecodethisisjustatribute';

		$this->expectException( ApiUsageException::class );
		$this->expectExceptionMessage(
			'Unrecognized value for parameter "wikilambdaload_language": ' . $badLanguageCode . '.'
		);

		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z111',
			'wikilambdaload_language' => $badLanguageCode,
		] );
	}

	public function testRevisions_valid() {
		$revisionStore = $this->getServiceContainer()->getRevisionStore();
		$this->insertBuiltinObjects( [ 'Z11', 'Z12' ] );

		$titleZ11 = Title::newFromText( 'Z11', NS_MAIN );
		$titleZ12 = Title::newFromText( 'Z12', NS_MAIN );
		$revisionZ11 = $revisionStore->getKnownLatestRevision( $titleZ11 );
		$revisionZ12 = $revisionStore->getKnownLatestRevision( $titleZ12 );

		// Requesting Z11|Z12 with their correct revision numbers
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z11|Z12',
			'wikilambdaload_revisions' => $revisionZ11->getId() . '|' . $revisionZ12->getId(),
		] );

		$zobjects = $result[0]['query']['wikilambdaload_zobjects'];
		$this->assertTrue( $zobjects[ 'Z11' ][ 'success' ] );
		$this->assertTrue( $zobjects[ 'Z12' ][ 'success' ] );
	}

	public function testRevisions_invalid() {
		$revisionStore = $this->getServiceContainer()->getRevisionStore();
		$this->insertBuiltinObjects( [ 'Z11', 'Z12' ] );

		$titleZ11 = Title::newFromText( 'Z11', NS_MAIN );
		$revisionZ11 = $revisionStore->getKnownLatestRevision( $titleZ11 );

		$this->setExpectedApiException( [ 'apierror-query+wikilambdaload_zobjects-unloadable', 'Z12' ] );

		// Requesting Z11|Z12 with wrong revision numbers
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z11|Z12',
			'wikilambdaload_revisions' => $revisionZ11->getId() . '|999999',
		] );
	}

	public function testRevisions_badCount() {
		$revisionStore = $this->getServiceContainer()->getRevisionStore();
		$this->insertBuiltinObjects( [ 'Z11', 'Z12' ] );

		$titleZ11 = Title::newFromText( 'Z11', NS_MAIN );
		$revisionZ11 = $revisionStore->getKnownLatestRevision( $titleZ11 );

		$this->setExpectedApiException( [ 'wikilambda-zerror', 'Z500' ] );

		// Requesting Z11|Z12 with wrong revision numbers
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z11|Z12',
			'wikilambdaload_revisions' => $revisionZ11->getId(),
		] );
	}

	public function testDependencies() {
		$this->insertBuiltinObjects( [ 'Z8', 'Z17' ] );
		$this->editPage( 'Z10014', self::getTestFileContents( 'type-dependencies-Z10014.json' ), '', NS_MAIN );
		$this->editPage( 'Z10015', self::getTestFileContents( 'type-dependencies-Z10015.json' ), '', NS_MAIN );
		$this->editPage( 'Z10016', self::getTestFileContents( 'function-dependencies-Z10016.json' ), '', NS_MAIN );

		// Requesting Z10015 brings [ Z10015, Z10014 ]
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z10015',
			'wikilambdaload_get_dependencies' => 'true',
		] );

		$zobjects = $result[0]['query']['wikilambdaload_zobjects'];
		$zids = array_keys( $zobjects );
		$this->assertCount( 2, $zids );
		$this->assertTrue( $zobjects[ 'Z10015' ][ 'success' ] );
		$this->assertTrue( $zobjects[ 'Z10014' ][ 'success' ] );
		$this->assertSame( [ 'Z10015', 'Z10014' ], $zids );

		// Requesting Z10016 brings [ Z10016, Z10015, Z10014 ]
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z10016',
			'wikilambdaload_get_dependencies' => 'true',
		] );

		$zobjects = $result[0]['query']['wikilambdaload_zobjects'];
		$zids = array_keys( $zobjects );
		$this->assertCount( 3, $zids );
		$this->assertTrue( $zobjects[ 'Z10016' ][ 'success' ] );
		$this->assertTrue( $zobjects[ 'Z10015' ][ 'success' ] );
		$this->assertTrue( $zobjects[ 'Z10014' ][ 'success' ] );
		$this->assertSame( [ 'Z10016', 'Z10015', 'Z10014' ], $zids );
	}

	// Test private methods
	// ====================

	private function buildApi(): TestingAccessWrapper {
		$context = RequestContext::getMain();
		$main = new ApiMain( $context );
		$instance = new ApiQueryZObjects(
			$main->getModuleManager()->getModule( 'query' ),
			'wikilambdaload_zobjects',
			$this->getServiceContainer()->getLanguageFallback(),
			$this->getServiceContainer()->getLanguageNameUtils(),
			$this->getServiceContainer()->getTitleFactory(),
			$this->getServiceContainer()->getTracer()
		);
		return TestingAccessWrapper::newFromObject( $instance );
	}

	/**
	 * @dataProvider provideIsUnknownTypeReference
	 */
	public function testIsUnknownTypeReference( $value, $expected ) {
		$api = $this->buildApi();
		$this->assertSame( $expected, $api->isUnknownTypeReference( $value ) );
	}

	private static function provideIsUnknownTypeReference() {
		$generic = '{ "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" }';
		return [
			'null is not an unknown type reference' => [ null, false ],
			'blank string is not an unknown type reference' => [ '', false ],
			'stdClass is not an unknown type reference' => [ json_decode( $generic ), false ],
			'array is not an unknown type reference' => [ json_decode( $generic, true ), false ],
			'builtin zid is not unknown' => [ 'Z11', false ],
			'zid might be an unknown type reference' => [ 'Z10000', true ],
		];
	}

	/**
	 * @dataProvider provideExtractTypeReferences
	 */
	public function testExtractTypeReferences( $input, array $expected ) {
		$api = $this->buildApi();
		$this->assertSame( $expected, $api->extractTypeReferences( $input ) );
	}

	public static function provideExtractTypeReferences() {
		return [
			'unknown string type returns itself' => [
				'Z10000',
				[ 'Z10000' ]
			],
			'builtin string type returns empty' => [
				'Z6',
				[]
			],
			'null returns empty' => [
				null,
				[]
			],
			'typed list with unknown item type' => [
				json_decode( '{ "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z10000" }' ),
				[ 'Z10000' ]
			],
			'typed list with builtin item type returns empty' => [
				json_decode( '{ "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" }' ),
				[]
			],
			'typed pair with two unknown types' => [
				json_decode( '{ "Z1K1": "Z7", "Z7K1": "Z882", "Z882K1": "Z10000", "Z882K2": "Z10001" }' ),
				[ 'Z10000', 'Z10001' ]
			],
			'typed map with two unknown types' => [
				json_decode( '{ "Z1K1": "Z7", "Z7K1": "Z883", "Z883K1": "Z10000", "Z883K2": "Z10001" }' ),
				[ 'Z10000', 'Z10001' ]
			],
			'typed pair with one builtin and one unknown' => [
				json_decode( '{ "Z1K1": "Z7", "Z7K1": "Z882", "Z882K1": "Z6", "Z882K2": "Z10000" }' ),
				[ 'Z10000' ]
			],
		];
	}

	public function testGetTypeDependenciesForType() {
		$api = $this->buildApi();

		$zobject = json_decode( '{ "Z2K2": { "Z1K1": "Z4", "Z4K2": [ "Z3",'
			. ' { "Z3K1": "Z6" }, '
			. ' { "Z3K1": "Z10001" }, '
			. ' { "Z3K1": { "Z1K1": "Z7", "Z7K1": "Z882", "Z882K1": "Z11", "Z882K2": "Z10002" } } '
			. ' ] } }' );

		$dependencies = $api->getTypeDependencies( $zobject );
		$this->assertSame( [ 'Z10001', 'Z10002' ], $dependencies );
	}

	public function testGetTypeDependenciesForFunction() {
		$api = $this->buildApi();

		$zobject = json_decode( '{ "Z2K2": { "Z1K1": "Z8", "Z8K1": [ "Z17",'
			. ' { "Z17K1": "Z6" }, '
			. ' { "Z17K1": "Z10001" }, '
			. ' { "Z17K1": { "Z1K1": "Z7", "Z7K1": "Z882", "Z883K1": "Z10002", "Z883K2": "Z12" } }, '
			. ' { "Z17K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z10003" } } '
			. ' ] } }' );

		$dependencies = $api->getTypeDependencies( $zobject );
		$this->assertSame( [ 'Z10001', 'Z10002', 'Z10003' ], $dependencies );
	}
}
