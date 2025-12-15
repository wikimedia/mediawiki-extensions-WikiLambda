<?php
/**
 * Wikifunctions HTML sanitising API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use MediaWiki\Api\ApiMain;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentSanitiserTokenHandler;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\PoolCounter\PoolCounterWorkViaCallback;
use Wikimedia\ParamValidator\ParamValidator;

class ApiWikifunctionsHTMLSanitiser extends WikiLambdaApiBase {

	public function __construct( ApiMain $mainModule, string $moduleName ) {
		parent::__construct( $mainModule, $moduleName );

		$this->setUp();
	}

	/**
	 * @inheritDoc
	 */
	protected function run(): void {
		$userHTMLToClean = $this->getParameter( 'html' );

		$logger = LoggerFactory::getInstance( 'WikiLambda' );

		// Use a pool counter to limit concurrency; this is probably over-kill for simple HTML sanitisation.
		$work = new PoolCounterWorkViaCallback(
			'WikifunctionsSanitiseHTMLFragment',
			$this->getUser()->getName(),
			[
				'doWork' => static function () use ( $logger, $userHTMLToClean ) {
					return WikifunctionsPFragmentSanitiserTokenHandler::sanitiseHtmlFragment(
						$logger,
						$userHTMLToClean
					);
				},
				'error' => function ( \MediaWiki\Status\Status $status ) {
					$this->dieWithError(
						[ "apierror-wikifunctions_sanitise_html_fragment-concurrency-limit" ],
						null, null, HttpStatus::TOO_MANY_REQUESTS
					);
				}
			]
		);
		$response = $work->execute();

		$this->getResult()->addValue(
			null,
			$this->getModuleName(),
			[
				'success' => true,
				'value' => $response
			]
		);
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	public function mustBePosted() {
		return true;
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	public function isWriteMode() {
		return true;
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	public function needsToken(): string {
		return 'csrf';
	}

	/**
	 * Mark as internal. This isn't meant to be user-facing, and can change at any time.
	 * @return bool
	 * @codeCoverageIgnore
	 */
	public function isInternal() {
		return true;
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getAllowedParams(): array {
		return [
			'html' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => '',
			],
		];
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages() {
		return [
			'action=wikifunctions_html_sanitiser&format=json&html='
				. urlencode( '<p><b>Hello</b>, <em>world</em>!</p>' )
				=> 'apihelp-wikifunctions_html_sanitiser-example-untouched',
			'action=wikifunctions_html_sanitiser&format=json&html='
				. urlencode( '<a href="www.example.com/foo">Naughty and not allowed!</a>' )
				=> 'apihelp-wikifunctions_html_sanitiser-example-prohibited',
		];
	}
}
