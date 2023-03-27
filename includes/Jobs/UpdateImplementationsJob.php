<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Jobs;

use GenericParameterJob;
use Job;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Title\Title;
use Psr\Log\LoggerInterface;

/**
 */
class UpdateImplementationsJob extends Job implements GenericParameterJob {

	/** @var LoggerInterface */
	protected $logger;

	/**
	 * @param array $params
	 */
	public function __construct( array $params ) {
		parent::__construct( 'updateImplementations', $params );
		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );

		$this->logger->info(
			__METHOD__ . ' Job created!',
			[
				'params' => $params
			]
		);
	}

	/**
	 * @return bool
	 * @throws ZErrorException from ZFunction::getImplementationZids
	 */
	public function run() {
		$this->logger->info(
			__METHOD__ . ' Job being run!',
			[
				'params' => $this->params
			]
		);

		// ZID of the function whose Z8K4/implementations are to be updated
		$functionZid = $this->params[ 'functionZid' ];
		// Function revision detected by the creator/caller of this job
		$functionRevision = $this->params[ 'functionRevision' ];
		// List of newly-ranked Zids of implementations
		$implementationRankingZids = $this->params[ 'implementationRankingZids' ];

		$targetTitle = Title::newFromText( $functionZid, NS_MAIN );
		$currentRevision = $targetTitle->getLatestRevID();
		// TODO (T330030): Consider accessing the ZObjectStore as an injected service
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjectStore $zObjectStore';
		$targetObject = $zObjectStore->fetchZObjectByTitle( $targetTitle );
		$targetFunction = $targetObject->getInnerZObject();
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunction $targetFunction';
		// Last-moment update-compatibility check
		if ( $currentRevision !== $functionRevision ) {
			// If Z8K4/implementations elements are different than those in the ranking, bail out
			$currentImplementationZids = $targetFunction->getImplementationZids();
			if (
				( count( $implementationRankingZids ) !== count( $currentImplementationZids ) )
				|| array_diff( $implementationRankingZids, $currentImplementationZids )
			) {
				$this->logger->debug(
					__CLASS__ . ' Bailing: attached ZIDs have changed!',
					[
						'functionZid' => $functionZid,
						'functionRevision' => $functionRevision,
						'implementationRankingZids' => $implementationRankingZids,
						'currentImplementationZids' => $currentImplementationZids
					]
				);
				return false;
			}
		}

		$this->logger->info(
			__CLASS__ . ' Editing Function to update Implementations order',
			[
				'functionZid' => $functionZid,
				'functionRevision' => $functionRevision,
				'implementationRankingZids' => $implementationRankingZids
			]
		);

		$implementationRanking = [];
		foreach ( $implementationRankingZids as $implementationZid ) {
			$implementationRanking[] = new ZReference( $implementationZid );
		}

		// Update function with the new ranking
		$targetFunction->setValueByKey(
			ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS,
			new ZTypedList(
				ZTypedList::buildType( new ZReference( ZTypeRegistry::Z_IMPLEMENTATION ) ),
				$implementationRanking
			)
		);
		// TODO (T330032): Consider accessing wfMessage as an injected service
		$updatingComment = wfMessage( 'wikilambda-updated-implementations-summary' )
			->inLanguage( 'en' )->text();
		$editStatus = $zObjectStore->updateZObjectAsSystemUser( $functionZid,
			$targetObject->getZObject()->__toString(), $updatingComment );

		$this->logger->info(
			__CLASS__ . ' Edited Function to update Implementations order',
			[
				'functionZid' => $functionZid,
				'functionRevision' => $functionRevision,
				'statusOK' => $editStatus->isOK(),
				'statusErrors' => $editStatus->getErrors(),
			]
		);

		return true;
	}
}
