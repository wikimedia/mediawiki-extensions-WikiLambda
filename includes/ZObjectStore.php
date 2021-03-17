<?php
/**
 * WikiLambda Data Access Object service
 *
 * @file
 * @ingroup Extensions
 * @copyright 2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Extension\WikiLambda\ZObjects\ZObjectContent;
use MediaWiki\Page\WikiPageFactory;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\Revision\SlotRecord;
use Status;
use Title;
use TitleFactory;
use User;
use Wikimedia\Rdbms\ILoadBalancer;

class ZObjectStore {

	/** @var ILoadBalancer */
	private $loadBalancer;

	/** @var TitleFactory */
	protected $titleFactory;

	/** @var WikiPageFactory */
	protected $wikiPageFactory;

	/** @var RevisionStore */
	protected $revisionStore;

	/**
	 * @param ILoadBalancer $loadBalancer
	 * @param TitleFactory $titleFactory
	 * @param WikiPageFactory $wikiPageFactory
	 * @param RevisionStore $revisionStore
	 */
	public function __construct(
		ILoadBalancer $loadBalancer,
		TitleFactory $titleFactory,
		WikiPageFactory $wikiPageFactory,
		RevisionStore $revisionStore
	) {
		$this->loadBalancer = $loadBalancer;
		$this->titleFactory = $titleFactory;
		$this->wikiPageFactory = $wikiPageFactory;
		$this->revisionStore = $revisionStore;
	}

	/**
	 * Find next available ZID in the database to create a new ZObject
	 *
	 * @return string Next available ZID
	 */
	public function getNextAvailableZid() : string {
		$dbr = $this->loadBalancer->getConnectionRef( DB_MASTER );
		$res = $dbr->select(
			/* FROM */ 'page',
			/* SELECT */ [ 'page_title' ],
			/* WHERE */ [
				'page_namespace' => NS_ZOBJECT,
			],
			__METHOD__,
			[
				'GROUP BY' => 'page_id',
				'ORDER BY' => 'page_id DESC',
				'LIMIT' => 1,
			]
		);

		// TODO: Take 'Z9999' to extension constants when we define the ZID ranges
		// available for new ZObjects.
		// TODO: Maybe getNextAvailableZid will need to take ZType as an input in
		// order to assign zid in different ranges.
		$highestZid = $res->numRows() > 0 ? $res->fetchRow()[ 0 ] : 'Z9999';
		$targetZid = 'Z' . ( max( intval( substr( $highestZid, 1 ) ) + 1, 10000 ) );

		return $targetZid;
	}

	/**
	 * Fetch the ZObject given its title and return it wrapped in a ZObjectContent object
	 *
	 * @param Title $title
	 * @return ZObjectContent|bool Found ZObject
	 */
	public function fetchZObjectByTitle( Title $title ) {
		$revision = $this->revisionStore->getRevisionByTitle( $title );
		if ( !$revision ) {
			// TODO: Handle errors by creating and returning Z5
			return false;
		}

		// NOTE: Hard-coding use of MAIN slot; if we're going the MCR route, we may wish to change this (or not).
		$text = $revision->getSlot( SlotRecord::MAIN, RevisionRecord::RAW )->getContent()->getNativeData();

		// TODO: Can this conversion from text to ZObjectContent generate errors?
		$zObject = new ZObjectContent( $text );

		return $zObject;
	}

	/**
	 * Create a new ZObject, with a newly assigned ZID, and store it in the Database
	 *
	 * @param string $data
	 * @param string $summary
	 * @param User $user
	 * @return Status status
	 */
	public function createZObject( string $data, string $summary, User $user ) : Status {
		$zid = $this->getNextAvailableZid();
		$title = $this->titleFactory->newFromText( $zid, NS_ZOBJECT );
		if ( $title instanceof Title ) {
			$page = $this->wikiPageFactory->newFromTitle( $title );
			$content = ZObjectContentHandler::makeContent( $data, $title );
			$status = $page->doEditContent( $content, $summary, EDIT_NEW, false, $user );
			return $status;
		}
		return Status::newFatal( 'wikilambda-invalidzojecttitle', $zid );
	}

	/**
	 * Delete the labels from the wikilambda_zobject_labels database that correspond
	 * to the given ZID.
	 *
	 * @param string $zid
	 */
	public function deleteZObjectLabelsByZid( string $zid ) {
		$dbr = $this->loadBalancer->getConnectionRef( DB_MASTER );
		$dbr->delete(
			'wikilambda_zobject_labels',
			[ 'wlzl_zobject_zid' => $zid ]
		);
	}

	/**
	 * Delete the label conflicts from the wikilambda_zobject_label_conflicts database
	 * that correspond to the given ZID.
	 *
	 * @param string $zid
	 */
	public function deleteZObjectLabelConflictsByZid( string $zid ) {
		$dbr = $this->loadBalancer->getConnectionRef( DB_MASTER );
		$dbr->delete(
			'wikilambda_zobject_label_conflicts',
			$dbr->makeList(
				[
					'wlzlc_existing_zid' => $zid,
					'wlzlc_conflicting_zid' => $zid
				],
				$dbr::LIST_OR
			)
		);
	}

	/**
	 * Query the wikilambda_zobject_labels database for labels that have
	 * the same combination of language code and value for a different ZID
	 * than the given in the parameters. These will be considered conflicting labels.
	 *
	 * @param string $zid
	 * @param string $ztype
	 * @param array $labels Array of labels, where the key is the language code and the value
	 * is the string representation of the label in that language
	 * @return array Conflicts found in the wikilambda_zobject_labels database
	 */
	public function findZObjectLabelConflicts( $zid, $ztype, $labels ) : array {
		$dbr = $this->loadBalancer->getConnectionRef( DB_MASTER );

		if ( $labels === [] ) {
			return [];
		}

		$labelConflictConditions = [];
		foreach ( $labels as $language => $value ) {
			$labelConflictConditions[] = $dbr->makeList( [
				'wlzl_language' => $language,
				'wlzl_label' => $value
			], $dbr::LIST_AND );
		}

		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_labels',
			/* SELECT */ [ 'wlzl_zobject_zid', 'wlzl_language' ],
			/* WHERE */ [
				'wlzl_zobject_zid != ' . $dbr->addQuotes( $zid ),
				// TODO: Check against type, once we properly implement that.
				// 'wlzl_type' => $dbr->addQuotes( $ztype ),
				$dbr->makeList( $labelConflictConditions, $dbr::LIST_OR )
			]
		);

		$conflicts = [];
		foreach ( $res as $row ) {
			// TODO: What if more than one conflicts with us on each language?
			$conflicts[ $row->wlzl_language ] = $row->wlzl_zobject_zid;
		}

		return $conflicts;
	}

	/**
	 * Insert labels into the wikilambda_zobject_labels database for a given ZID and Type
	 *
	 * @param string $zid
	 * @param string $ztype
	 * @param array $labels Array of labels, where the key is the language code and the value
	 * is the string representation of the label in that language
	 * @return void|bool
	 */
	public function insertZObjectLabels( $zid, $ztype, $labels ) {
		$dbr = $this->loadBalancer->getConnectionRef( DB_MASTER );

		$updates = [];
		foreach ( $labels as $language => $value ) {
			$updates[] = [
				'wlzl_zobject_zid' => $zid,
				'wlzl_language' => $language,
				'wlzl_type' => $ztype,
				'wlzl_label' => $value,
				'wlzl_label_normalised' => ZObjectUtils::comparableString( $value )
			];
		}

		return $dbr->insert( 'wikilambda_zobject_labels', $updates );
	}

	/**
	 * Insert label conflicts into the wikilambda_zobject_label_conflicts database for a given ZID
	 *
	 * @param string $zid
	 * @param array $conflicts Array of labels, where the key is the language code and the value
	 * is the other ZID for which this label is repeated
	 * @return void|bool
	 */
	public function insertZObjectLabelConflicts( $zid, $conflicts ) {
		$dbr = $this->loadBalancer->getConnectionRef( DB_MASTER );

		$updates = [];
		foreach ( $conflicts as $language => $existingZid ) {
			$updates[] = [
				'wlzlc_existing_zid' => $existingZid,
				'wlzlc_conflicting_zid' => $zid,
				'wlzlc_language' => $language,
			];
		}

		return $dbr->insert( 'wikilambda_zobject_label_conflicts', $updates );
	}
}
