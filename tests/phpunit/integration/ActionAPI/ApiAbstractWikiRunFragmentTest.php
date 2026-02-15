<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Http\MWHttpRequest;
use MediaWiki\Tests\Api\ApiTestCase;
use StatusValue;

/**
 * @coversNothing
 */
class ApiAbstractWikiRunFragmentTest extends ApiTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', 'test.wikifunctions.org' );
	}

	/**
	 * @param string $functionCall
	 * @param string $functionCallResponse
	 * @return HttpRequestFactory
	 */
	private function getMockHttpRequestFactory( $functionCall, $functionCallResponse ) {
		$apiResponse = json_encode( [
			'wikilambda_function_call' => [
				'data' => json_encode( [
					'Z22K1' => json_decode( $functionCallResponse ),
					'Z22K2' => [ 'returned metadata is ignored' ]
				] ) ]
		] );

		// Mock MWHttpRequest that returns a successful response
		$request = $this->createMock( MWHttpRequest::class );
		$request->method( 'execute' )->willReturn( StatusValue::newGood() );
		$request->method( 'getContent' )->willReturn( $apiResponse );

		// Mock HttpRequestFactory and assert the expected request
		$expectedUri = 'test.wikifunctions.org/w/api.php';
		$expectedPaylod = [
			'method' => 'POST',
			'postData' => [
				'format' => 'json',
				'action' => 'wikilambda_function_call',
				'wikilambda_function_call_zobject' => json_encode( json_decode( $functionCall ) )
			]
		];

		$factory = $this->createMock( HttpRequestFactory::class );
		$factory
			->expects( $this->once() )
			->method( 'create' )
			->with( $expectedUri, $expectedPaylod )
			->willReturn( $request );

		return $factory;
	}

	public function testExecuteSuccessfully() {
		// Parameters for abstractwiki_run_fragment
		$qid = 'Q42';
		$language = 'Z1002';
		$date = '26-7-2023';
		$fragment = '{"Z1K1":"Z89", "Z89K1":"<b>literal fragment</b>"}';

		// Mock request to wikilambda_function_call
		$functionCall = $this->buildWrapperFunctionCall( $qid, $language, $date, $fragment );
		$factory = $this->getMockHttpRequestFactory( $functionCall, $fragment );
		$this->setService( 'HttpRequestFactory', $factory );

		// Make request to abstractwiki_run_fragment
		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $language,
			'abstractwiki_run_fragment_date' => $date,
			'abstractwiki_run_fragment_fragment' => $fragment,
		] )[0][ 'abstractwiki_run_fragment' ];

		$this->assertArrayHasKey( 'success', $result );
		$this->assertArrayHasKey( 'data', $result );
		$this->assertSame( '<b>literal fragment</b>', $result[ 'data' ] );
	}

	private function buildWrapperFunctionCall( $qid, $language, $date, $fragment ) {
		return '{"Z1K1":"Z7",'
			. '"Z7K1":{"Z1K1":"Z8",'
			. '"Z8K1":["Z17",'
			. '{"Z1K1":"Z17","Z17K1":"Z6091","Z17K2":"Z825K1","Z17K3":{"Z1K1":"Z12","Z12K1":["Z11",'
			. '{"Z1K1":"Z11","Z11K1":"Z1002","Z11K2":"wikidata item reference"}]}},'
			. '{"Z1K1":"Z17","Z17K1":"Z60","Z17K2":"Z825K2","Z17K3":{"Z1K1":"Z12","Z12K1":["Z11",'
			. '{"Z1K1":"Z11","Z11K1":"Z1002","Z11K2":"language"}]}},'
			. '{"Z1K1":"Z17","Z17K1":"Z20420","Z17K2":"Z825K3","Z17K3":{"Z1K1":"Z12","Z12K1":["Z11",'
			. '{"Z1K1":"Z11","Z11K1":"Z1002","Z11K2":"date"}]}}],'
			. '"Z8K2":"Z89",'
			. '"Z8K3":["Z20"],'
			. '"Z8K4":["Z14",{"Z1K1":"Z14","Z14K1":"Z825","Z14K2":' . $fragment . '}],'
			. '"Z8K5":"Z825"},'
			. '"Z825K1":{"Z1K1":"Z6091","Z6091K1":"' . $qid . '"},'
			. '"Z825K2":"' . $language . '",'
			. '"Z825K3":{"Z1K1":"Z7","Z7K1":"Z20808","Z20808K1":"' . $date . '","Z20808K2":"' . $language . '"}}';
	}
}
