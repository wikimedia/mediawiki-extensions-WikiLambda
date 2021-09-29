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

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\MediaWikiServices;
use MediaWiki\Page\WikiPageFactory;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\Revision\SlotRecord;
use Status;
use Title;
use TitleFactory;
use User;
use Wikimedia\Rdbms\ILoadBalancer;
use Wikimedia\Rdbms\IResultWrapper;
use WikiPage;

class ZObjectStore {

	/**
	 * An array of ZTypes which are prohibited from creation by any user. (T278175)
	 */
	private const PROHIBITED_Z2_TYPES = [
		ZTypeRegistry::Z_PERSISTENTOBJECT,
		ZTypeRegistry::Z_ERROR,
		ZTypeRegistry::Z_CODE,
		ZTypeRegistry::Z_ARGUMENTDECLARATION,
		ZTypeRegistry::Z_ARGUMENTREFERENCE,
		ZTypeRegistry::Z_NULL,
		ZTypeRegistry::Z_KEYREFERENCE,
		ZTypeRegistry::Z_BOOLEAN,
	];

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
	public function getNextAvailableZid(): string {
		// Intentionally use DB_PRIMARY as we need the latest data here.
		$dbr = $this->loadBalancer->getConnectionRef( DB_PRIMARY );
		$res = $dbr->select(
			/* FROM */ 'page',
			/* SELECT */ [ 'page_title' ],
			/* WHERE */ [
				'page_namespace' => NS_MAIN,
				'LENGTH( page_title ) > 5'
			],
			__METHOD__,
			[
				'GROUP BY' => 'page_id,page_title',
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
		$slot = $revision->getSlot( SlotRecord::MAIN, RevisionRecord::RAW );
		// @phan-suppress-next-line PhanTypeMismatchReturnSuperType
		return $slot->getContent();
	}

	/**
	 * Create a new ZObject, with a newly assigned ZID, and store it in the Database
	 *
	 * @param string $data
	 * @param string $summary
	 * @param User $user
	 * @return WikiPage|Status Created page if success creation, status if failed
	 */
	public function createNewZObject( string $data, string $summary, User $user ) {
		// Find all placeholder ZIDs and ZKeys and replace those with the next available ZID
		$zid = $this->getNextAvailableZid();
		$zPlaceholderRegex = '/\"' . ZTypeRegistry::Z_NULL_REFERENCE . '(K[1-9]\d*)?\"/';
		$zObjectString = preg_replace( $zPlaceholderRegex, "\"$zid$1\"", $data );

		return $this->updateZObject( $zid, $zObjectString, $summary, $user, EDIT_NEW );
	}

	/**
	 * Create or update a ZObject it in the Database
	 *
	 * @param string $zid
	 * @param string $data
	 * @param string $summary
	 * @param User $user
	 * @param int $flags
	 * @return WikiPage|Status Updated page if success update, status if failed
	 */
	public function updateZObject( string $zid, string $data, string $summary, User $user, int $flags = EDIT_UPDATE ) {
		$title = $this->titleFactory->newFromText( $zid, NS_MAIN );

		if ( !( $title instanceof Title ) ) {
			return Status::newFatal( 'wikilambda-invalidzobjecttitle', $zid );
		}

		try {
			$content = ZObjectContentHandler::makeContent( $data, $title );
		} catch ( ZErrorException $e ) {
			// Error: Invalid input syntax
			return Status::newFatal( $e->getMessage() );
		}

		// Error: ZObject validation errors.
		if ( !( $content->isValid() ) ) {
			return $content->getStatus();
		}

		// Validate that $zid and zObject[Z2K1] are the same
		$zObjectId = $content->getZid();
		if ( $zObjectId !== $zid ) {
			return Status::newFatal( 'apierror-wikilambda_edit-unmatchingzid', $zid, $zObjectId );
		}

		// Find the label conflicts.
		$labels = $content->getLabels()->getZValue();
		$ztype = $content->getZType();
		$clashes = $this->findZObjectLabelConflicts( $zid, $ztype, $labels );
		if ( count( $clashes ) > 0 ) {
			// Error: Found label conflicts
			$status = new Status();
			foreach ( $clashes as $language => $clash_zid ) {
				$status->fatal( 'wikilambda-labelclash', $clash_zid, $language );
			}
			return $status;
		}

		// Double-check that the user has permissions to edit (should be caught by the lower parts of the stack)
		// TODO: This should use the Authority concept, not the soon-to-be-legacy PermissionManager.
		$permissionManager = MediaWikiServices::getInstance()->getPermissionManager();
		if ( !$permissionManager->userCan( 'edit', $user, $title ) ) {
			if ( !( $title->exists() ) ) {
				// User is trying to create a page and is prohibited, e.g. logged-out.
				return Status::newFatal( 'nocreatetext' );
			} else {
				// User is trying to edit a page and is prohibited, e.g. blocked, but we don't know why,
				// so give them the most generic error that MediaWiki has.
				return Status::newFatal( 'badaccess-group0' );
			}
		}

		// Prohibit certain kinds of edit to regular users; system users are allowed to edit anything, as
		// otherwise the initial content injection / etc. would fail.
		if ( !$user->isSystemUser() ) {
			// (T278175) Prohibit certain kinds of ZTypes from being instantiated as top-level wiki pages
			if (
				in_array( $ztype, self::PROHIBITED_Z2_TYPES )
				// We only care at creation time; edits (e.g. label changes) are OK.
				&& !$title->exists()
				) {
					return Status::newFatal( 'wikilambda-prohibitedcreationtype', $ztype );
			}

			// (T275940) TODO: Check the user has the right for certain kinds of edit to certain kinds of type
			// (e.g. limits on creation of Z60/Natural language, Z61/Programming language, …; limits on edits
			// on built-in items)
		}

		// We prepare the content to be saved
		$page = $this->wikiPageFactory->newFromTitle( $title );
		try {
			$status = $page->doUserEditContent( $content, $user, $summary, $flags );
		} catch ( \Exception $e ) {
			// Error: Database or a deeper MediaWiki error, e.g. a general editing rate limit
			return Status::newFatal( $e->getMessage() );
		}

		if ( !$status->isOK() ) {
			// Error: Other doUserEditContent related errors
			return $status;
		}

		// Success: return WikiPage
		return $page;
	}

	/**
	 * Delete the labels from the wikilambda_zobject_labels database that correspond
	 * to the given ZID.
	 *
	 * @param string $zid
	 */
	public function deleteZObjectLabelsByZid( string $zid ) {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );
		$dbw->delete(
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
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );
		$dbw->delete(
			'wikilambda_zobject_label_conflicts',
			$dbw->makeList(
				[
					'wlzlc_existing_zid' => $zid,
					'wlzlc_conflicting_zid' => $zid
				],
				$dbw::LIST_OR
			)
		);
	}

	/**
	 * Query the wikilambda_zobject_labels database for primary labels that have
	 * the same combination of language code and value for a different ZID
	 * than the given in the parameters. These will be considered conflicting labels.
	 *
	 * @param string $zid
	 * @param string $ztype
	 * @param array $labels Array of labels, where the key is the language code and the value
	 * is the string representation of the label in that language
	 * @return array Conflicts found in the wikilambda_zobject_labels database
	 */
	public function findZObjectLabelConflicts( $zid, $ztype, $labels ): array {
		$dbr = $this->loadBalancer->getConnectionRef( DB_REPLICA );

		if ( $labels === [] ) {
			return [];
		}

		$labelConflictConditions = [];
		foreach ( $labels as $language => $value ) {
			$labelConflictConditions[] = $dbr->makeList( [
				'wlzl_language' => $language,
				'wlzl_label' => $value,
				'wlzl_label_primary' => true
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
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );

		$updates = [];
		foreach ( $labels as $language => $value ) {
			$updates[] = [
				'wlzl_zobject_zid' => $zid,
				'wlzl_language' => $language,
				'wlzl_type' => $ztype,
				'wlzl_label' => $value,
				'wlzl_label_normalised' => ZObjectUtils::comparableString( $value ),
				'wlzl_label_primary' => true
			];
		}

		return $dbw->insert( 'wikilambda_zobject_labels', $updates );
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
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );

		$updates = [];
		foreach ( $conflicts as $language => $existingZid ) {
			$updates[] = [
				'wlzlc_existing_zid' => $existingZid,
				'wlzlc_conflicting_zid' => $zid,
				'wlzlc_language' => $language,
			];
		}

		return $dbw->insert( 'wikilambda_zobject_label_conflicts', $updates );
	}

	/**
	 * Insert alias (secondary labels) into the wikilambda_zobject_labels database for a given ZID and Type
	 *
	 * @param string $zid
	 * @param string $ztype
	 * @param array $aliases Set of labels, where the key is the language code
	 * and the value is an array of strings
	 * @return void|bool
	 */
	public function insertZObjectAliases( $zid, $ztype, $aliases ) {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );

		$updates = [];
		foreach ( $aliases as $language => $stringset ) {
			foreach ( $stringset as $value ) {
				$updates[] = [
					'wlzl_zobject_zid' => $zid,
					'wlzl_language' => $language,
					'wlzl_type' => $ztype,
					'wlzl_label' => $value,
					'wlzl_label_normalised' => ZObjectUtils::comparableString( $value ),
					'wlzl_label_primary' => false
				];
			}
		}

		return $dbw->insert( 'wikilambda_zobject_labels', $updates );
	}

	/**
	 * Gets from the secondary database a list of all Zids belonging to a given type
	 *
	 * @param string $ztype
	 * @return string[]
	 */
	public function fetchZidsOfType( $ztype ) {
		$dbr = $this->loadBalancer->getConnectionRef( DB_REPLICA );
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_labels',
			/* SELECT */ [ 'wlzl_zobject_zid' ],
			/* WHERE */ [
				'wlzl_type' => $ztype
			],
			__METHOD__,
			[
				'ORDER BY' => 'wlzl_zobject_zid ASC',
			]
		);

		$zids = [];
		foreach ( $res as $row ) {
			$zids[] = $row->wlzl_zobject_zid;
		}
		return $zids;
	}

	/**
	 * Get a list of all Zids persisted in the database
	 *
	 * @return string[] All persisted Zids
	 */
	public function fetchAllZids() {
		$dbr = $this->loadBalancer->getConnectionRef( DB_REPLICA );
		$res = $dbr->select(
			/* FROM */ 'page',
			/* SELECT */ [ 'page_title' ],
			/* WHERE */ [
				'page_namespace' => NS_MAIN
			]
		);

		$zids = [];
		foreach ( $res as $row ) {
			$zids[] = $row->page_title;
		}
		return $zids;
	}

	/**
	 * Search labels in the secondary database, filtering by language Zids, type or label string.
	 *
	 * @param string $label Term to search in the label database
	 * @param bool $exact Whether to search by exact match
	 * @param string[] $languages List of language Zids to filter by
	 * @param string|null $type Zid of the type to filter by. If null, don't filter by type.
	 * @param string|null $continue Id to start. If null, start from the first result.
	 * @param int $limit Maximum number of results to return.
	 * @return IResultWrapper
	 */
	public function fetchZObjectLabels( $label, $exact, $languages, $type, $continue, $limit ) {
		$dbr = $this->loadBalancer->getConnectionRef( DB_REPLICA );

		// Set language filter
		$conditions = [ 'wlzl_language' => $languages ];

		// Set type filter
		if ( $type != null ) {
			$conditions[] = 'wlzl_type = ' . $dbr->addQuotes( $type );
		}

		// Set minimum id bound if we are continuing a paged result
		if ( $continue != null ) {
			$conditions[] = "wlzl_id >= $continue";
		}

		// Set search Term
		if ( $exact ) {
			$searchedColumn = 'wlzl_label';
			$searchTerm = $label;
		} else {
			$searchedColumn = 'wlzl_label_normalised';
			$searchTerm = ZObjectUtils::comparableString( $label );
		}
		$conditions[] = $searchedColumn . $dbr->buildLike( $dbr->anyString(), $searchTerm, $dbr->anyString() );

		// $dbr->addOption( 'LIMIT', $limit + 1 );
		return $dbr->select(
			/* FROM */ 'wikilambda_zobject_labels',
			/* SELECT */ [
				'wlzl_zobject_zid',
				'wlzl_type',
				'wlzl_language',
				'wlzl_label',
				'wlzl_label_primary',
				'wlzl_id'
			],
			/* WHERE */ $dbr->makeList( $conditions, $dbr::LIST_AND ),
			__METHOD__,
			[
				'ORDER BY' => 'wlzl_id ASC',
				'LIMIT' => $limit,
			]
		);
	}

	/**
	 * Search implementations in the secondary database, return the first one
	 * This function is primarily used for the example API request
	 *
	 * @return string
	 */
	public function findFirstZImplementationFunction(): string {
		$dbr = $this->loadBalancer->getConnectionRef( DB_REPLICA );
		$res = $dbr->selectField(
			/* FROM */ 'wikilambda_zobject_function_join',
			/* SELECT */ 'wlzf_zfunction_zid',
			/* WHERE */ [
				'wlzf_type' => 'Z14',
			],
			__METHOD__
		);

		return $res ? (string)$res : '';
	}

	/**
	 * Search implementations in the secondary database and return all matching a given ZID
	 *
	 * @param string $zid the ZID of the ZFunction
	 * @param string $type the type of the ZFunction reference
	 * @return string[] All ZIDs of referenced ZObjects associated to the ZFunction
	 */
	public function findReferencedZObjectsByZFunctionId( $zid, $type ): array {
		$dbr = $this->loadBalancer->getConnectionRef( DB_REPLICA );
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_function_join',
			/* SELECT */ [ 'wlzf_ref_zid' ],
			/* WHERE */ [
				'wlzf_zfunction_zid' => $zid,
				'wlzf_type' => $type,
			],
			__METHOD__
		);

		$zids = [];
		foreach ( $res as $row ) {
			$zids[] = $row->wlzf_ref_zid;
		}

		return $zids;
	}

	/**
	 * Add a record to the database for a given ZObject ID and ZFunction ID
	 *
	 * @param string $refId the ZObject ref ID
	 * @param string $zFunctionId the ZFunction ID
	 * @param string $type the type of the ZFunction reference
	 * @return void|bool
	 */
	public function insertZFunctionReference( $refId, $zFunctionId, $type ) {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );

		return $dbw->insert(
			'wikilambda_zobject_function_join',
			[
				[
					'wlzf_ref_zid' => $refId,
					'wlzf_zfunction_zid' => $zFunctionId,
					'wlzf_type' => $type
				]
			],
			__METHOD__
		);
	}

	/**
	 * Remove a given ZObject ref from the secondary database
	 *
	 * @param string $refId the ZObject ID
	 * @return void
	 */
	public function deleteZFunctionReference( $refId ): void {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );

		$dbw->delete(
			'wikilambda_zobject_function_join',
			[ 'wlzf_ref_zid' => $refId ],
			__METHOD__
		);
	}
}
