<?php

/**
 * WikiLambda integration test suite for WikiLambdaRESTHandler.
 *
 * WikiLambdaRESTHandler is the abstract base for every REST endpoint in the extension.
 * It contributes two helpers: dieRESTfully() throws a LocalizedHttpException, and
 * dieRESTfullyWithZError() is the specialised variant that packs a ZError into that
 * exception's errorData. The ZError variant also has a catch-branch fallback for the
 * case where getErrorData() itself throws while trying to render the error — a real
 * possibility because getErrorData() calls into message-rendering and serialisation.
 * That catch branch is particularly important: a bug there would mask *other* errors
 * in production. This test covers both paths.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\RESTAPI;

use MediaWiki\Extension\WikiLambda\RESTAPI\WikiLambdaRESTHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Rest\LocalizedHttpException;
use Psr\Log\LoggerInterface;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\RESTAPI\WikiLambdaRESTHandler
 */
class WikiLambdaRESTHandlerTest extends WikiLambdaIntegrationTestCase {

	/**
	 * Build an anonymous concrete subclass of the abstract base, with $logger injected
	 * (the base declares $logger but doesn't initialise it; in production each concrete
	 * handler does so in its constructor or execute()).
	 */
	private function newHandler( LoggerInterface $logger ): TestingAccessWrapper {
		$handler = new class extends WikiLambdaRESTHandler {
		};
		$wrapper = TestingAccessWrapper::newFromObject( $handler );
		$wrapper->logger = $logger;
		return $wrapper;
	}

	/**
	 * MessageValue wraps scalar params into ScalarParam objects; unwrap them back to
	 * their raw values so assertions can compare to plain arrays.
	 */
	private function extractParamValues( LocalizedHttpException $e ): array {
		return array_map(
			static fn ( $p ) => $p->getValue(),
			$e->getMessageValue()->getParams()
		);
	}

	public function testDieRESTfully_throwsLocalizedHttpExceptionWithExpectedShape() {
		$handler = $this->newHandler( $this->createMock( LoggerInterface::class ) );

		try {
			$handler->dieRESTfully( 'some-message-key', [ 'paramA', 'paramB' ], 418, [ 'extra' => 'value' ] );
			$this->fail( 'dieRESTfully must throw' );
		} catch ( LocalizedHttpException $e ) {
			$this->assertSame( 418, $e->getCode(), 'HTTP code is propagated' );
			$this->assertSame( 'some-message-key', $e->getMessageValue()->getKey() );
			$this->assertSame(
				[ 'paramA', 'paramB' ],
				$this->extractParamValues( $e ),
				'MessageValue params are the $spec array'
			);
			$this->assertSame(
				[ 'extra' => 'value' ],
				$e->getErrorData(),
				'errorData is the $errorData array, untouched'
			);
		}
	}

	public function testDieRESTfullyWithZError_packsErrorDataFromZError() {
		$errorDataFromZError = [
			'title' => 'A title',
			'message' => '<p>An HTML message</p>',
			'zerror' => (object)[ 'Z1K1' => 'Z5' ],
			'labelled' => 'A labelled form',
		];

		$zerror = $this->createMock( ZError::class );
		$zerror->method( 'getErrorData' )->willReturn( $errorDataFromZError );
		$zerror->method( 'getZErrorType' )->willReturn( 'Z504' );

		$logger = $this->createMock( LoggerInterface::class );
		$logger->expects( $this->never() )->method( 'warning' );
		$handler = $this->newHandler( $logger );

		try {
			$handler->dieRESTfullyWithZError( $zerror, 404 );
			$this->fail( 'dieRESTfullyWithZError must throw' );
		} catch ( LocalizedHttpException $e ) {
			$this->assertSame( 404, $e->getCode() );
			$this->assertSame( 'wikilambda-zerror', $e->getMessageValue()->getKey() );
			$this->assertSame(
				[ 'Z504' ],
				$this->extractParamValues( $e ),
				'The ZErrorType is the sole message-value param'
			);
			$this->assertSame(
				[ 'errorData' => $errorDataFromZError ],
				$e->getErrorData(),
				'ZError\'s getErrorData() output is nested under the "errorData" key'
			);
		}
	}

	public function testDieRESTfullyWithZError_mergesCallerErrorDataUnderErrorDataKey() {
		$zerror = $this->createMock( ZError::class );
		$zerror->method( 'getErrorData' )->willReturn( [ 'detail' => 'x' ] );
		$zerror->method( 'getZErrorType' )->willReturn( 'Z504' );

		$handler = $this->newHandler( $this->createMock( LoggerInterface::class ) );

		try {
			$handler->dieRESTfullyWithZError( $zerror, 400, [ 'callerField' => 'callerValue' ] );
			$this->fail( 'dieRESTfullyWithZError must throw' );
		} catch ( LocalizedHttpException $e ) {
			$data = $e->getErrorData();
			$this->assertSame( 'callerValue', $data['callerField'],
				'Caller-supplied errorData fields survive' );
			$this->assertSame( [ 'detail' => 'x' ], $data['errorData'],
				'ZError.getErrorData() is placed under "errorData"' );
		}
	}

	public function testDieRESTfullyWithZError_fallsBackAndLogsWhenGetErrorDataThrows() {
		$innerError = $this->createMock( ZError::class );
		$serialized = (object)[ 'Z1K1' => 'Z5', 'Z5K1' => 'Z504' ];

		$zerror = $this->createMock( ZError::class );
		$zerror->method( 'getErrorData' )
			->willThrowException( new ZErrorException( $innerError ) );
		$zerror->method( 'getSerialized' )->willReturn( $serialized );
		$zerror->method( 'getZErrorType' )->willReturn( 'Z504' );

		$logger = $this->createMock( LoggerInterface::class );
		$logger->expects( $this->once() )
			->method( 'warning' )
			->with(
				$this->stringContains( 'an error was thrown when trying to report an error' ),
				$this->callback( static function ( $context ) use ( $serialized ) {
					// The logged context must surface the serialised ZError so operators can
					// still diagnose the original problem even though the pretty-printer failed.
					return isset( $context['zerror'] )
						&& $context['zerror'] === $serialized
						&& isset( $context['error'] )
						&& $context['error'] instanceof ZErrorException;
				} )
			);

		$handler = $this->newHandler( $logger );

		try {
			$handler->dieRESTfullyWithZError( $zerror, 500 );
			$this->fail( 'dieRESTfullyWithZError must still throw even on fallback' );
		} catch ( LocalizedHttpException $e ) {
			$this->assertSame( 500, $e->getCode() );
			$this->assertSame( 'wikilambda-zerror', $e->getMessageValue()->getKey() );
			$this->assertSame(
				[ 'errorData' => [ 'zerror' => $serialized ] ],
				$e->getErrorData(),
				'Fallback errorData is just the serialised ZError under a "zerror" key'
			);
		}
	}
}
