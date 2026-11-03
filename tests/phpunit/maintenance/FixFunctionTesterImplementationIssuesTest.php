<?php

/**
 * WikiLambda integration test suite for the fixFunctionTesterImplementationIssues maintenance script
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Maintenance;

use MediaWiki\Extension\WikiLambda\Maintenance\FixFunctionTesterImplementationIssues;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectPage;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Json\FormatJson;

require_once dirname( __DIR__, 3 ) . '/maintenance/fixFunctionTesterImplementationIssues.php';

/**
 * @group Database
 * @group WikiLambdaIntegration
 * @covers \MediaWiki\Extension\WikiLambda\Maintenance\FixFunctionTesterImplementationIssues
 */
class FixFunctionTesterImplementationIssuesTest extends WikiLambdaMaintenanceTestCase {

	protected function getMaintenanceClass(): string {
		return FixFunctionTesterImplementationIssues::class;
	}

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
		// The pages of the function Z801 and its implementation Z901 exist.
		// Their types Z17 and Z14 must exist first, or the wiki rejects them.
		$this->insertZids( [ 'Z14', 'Z17', 'Z801', 'Z901' ] );
	}

	/**
	 * Replace the ZObject store with a mock where Z801 has the given implementations,
	 * and no other ZObject is valid.
	 *
	 * @param string[] $implementations
	 * @return ZObjectStore&\PHPUnit\Framework\MockObject\MockObject
	 */
	private function mockStoreWithImplementations( array $implementations ) {
		$function = json_decode( self::getDefinition( 'Z801' ) );
		$function->Z2K2->Z8K3 = [ 'Z20' ];
		$function->Z2K2->Z8K4 = [ 'Z14', ...$implementations ];
		$functionContent = new ZObjectContent( FormatJson::encode( $function ) );

		$wikiStore = WikiLambdaServices::getZObjectStore();
		$store = $this->createMock( ZObjectStore::class );
		// The validation of Z801 reads the type Z17 from the store
		$store->method( 'fetchZObjectByTitle' )->willReturnCallback( [ $wikiStore, 'fetchZObjectByTitle' ] );
		$store->method( 'getCountOfTypeInstances' )->willReturn( 1 );
		$store->method( 'fetchZObject' )->willReturnCallback(
			static fn ( string $zid ) => $zid === 'Z801' ? $functionContent : false
		);
		$this->setService( 'WikiLambdaZObjectStore', $store );
		return $store;
	}

	public function testKeepsImplementationThatExistsButIsNotValid(): void {
		// Z901 does not validate, and Z99999 does not exist
		$store = $this->mockStoreWithImplementations( [ 'Z901', 'Z99999' ] );
		$store->expects( $this->once() )
			->method( 'updateZObjectAsSystemUser' )
			->with(
				$this->anything(),
				'Z801',
				$this->callback(
					static fn ( string $json ) => json_decode( $json )->Z2K2->Z8K4 === [ 'Z14', 'Z901' ]
				),
				'Maintenance: removed 1 non-existent implementation(s)'
			)
			->willReturn( $this->createConfiguredMock( ZObjectPage::class, [ 'isOK' => true ] ) );

		$this->expectOutputRegex(
			'/Z801: Kept implementation\(s\) that exist but are not valid: Z901\n' .
			'.*Removed non-existent implementation ZIDs: Z99999\n/s'
		);

		$this->maintenance->loadWithArgv( [] );
		$this->maintenance->execute();
	}

	public function testDoesNotEditFunctionWhenAllItsImplementationsExist(): void {
		// Z901 does not validate
		$store = $this->mockStoreWithImplementations( [ 'Z901' ] );
		$store->expects( $this->never() )->method( 'updateZObjectAsSystemUser' );

		$this->expectOutputRegex( '/Z801: Kept implementation\(s\) that exist but are not valid: Z901\n/' );

		$this->maintenance->loadWithArgv( [] );
		$this->maintenance->execute();
	}
}
