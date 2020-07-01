<?php

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\Hooks;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\Hooks
 */
class HooksTest extends \MediaWikiUnitTestCase {

	/**
	 * @covers ::onBeforePageDisplay
	 */
	public function testOnBeforePageDisplay() {
		$config = new \HashConfig( [
			'WikiLambdaEnable' => true
		] );
		$outputPageMock = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$outputPageMock->method( 'getConfig' )
			->willReturn( $config );

		$outputPageMock->expects( $this->once() )
			->method( 'addModules' )
			->with( 'ext.wikilambda' );

		$skinMock = $this->getMockBuilder( \Skin::class )
			->disableOriginalConstructor()
			->getMock();

		( new Hooks )->onBeforePageDisplay( $outputPageMock, $skinMock );
	}

}
