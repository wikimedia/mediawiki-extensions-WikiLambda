<?php
/**
 * WikiLambda Orchestrator Interface
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;

class MockOrchestrator extends OrchestratorBase {

	/** @var MockHandler */
	private static $mock;

	/** @var MockOrchestrator */
	private static $instance;

	private function __construct() {
		$handler = HandlerStack::create( self::mock() );
		$this->guzzleClient = new Client( [ 'handler' => $handler ] );
	}

	/**
	 * Return (and possibly initialize) the singleton instance.
	 *
	 * @return MockOrchestrator
	 */
	public static function getInstance(): MockOrchestrator {
		if ( self::$instance == null ) {
			self::$instance = new MockOrchestrator();
		}
		return self::$instance;
	}

	/**
	 * Return (and possibly initialize) the MockHandler instance.
	 *
	 * @return MockHandler
	 */
	public static function mock(): MockHandler {
		if ( self::$mock == null ) {
			self::$mock = new MockHandler();
		}
		return self::$mock;
	}

}
