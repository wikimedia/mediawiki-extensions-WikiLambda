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

use MediaWiki\Extension\WikiLambda\ZObjects\ZKey;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObjectContent;
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
	public function getNextAvailableZid() : string {
		$dbr = $this->loadBalancer->getConnectionRef( DB_MASTER );
		$res = $dbr->select(
			/* FROM */ 'page',
			/* SELECT */ [ 'page_title' ],
			/* WHERE */ [
				'page_namespace' => NS_ZOBJECT,
				'LENGTH( page_title ) > 5'
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
	 * @return WikiPage|Status Created page if success creation, status if failed
	 */
	public function createNewZObject( string $data, string $summary, User $user ) {
		// $status = new Status();

		// Find all Z0s and Z0 keys and replace those with the next available ZID
		$zid = $this->getNextAvailableZid();
		$zObjectString = preg_replace( '/\"Z0(K[1-9]\d*)?\"/', "\"$zid$1\"", $data );

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
		// TODO: new ZObjectContent() instead:
		// 1. It will run ZObjectFactory::createFromSerializedObject and validate both the JSON and the ZObject.
		// 2. Fix it so that it saves the data of the ZPersistentObject, and we can use it to check the labels.

		// Parse the data string and catch JSON format validity errors.
		$zObjectNormal = json_decode( $data );
		if ( $zObjectNormal === null ) {
			// Error: Invalid JSON
			return Status::newFatal( 'apierror-wikilambda_edit-invalidjson', $data );
		}

		// Canonicalize zObject before saving it
		$zObject = ZObjectUtils::canonicalize( $zObjectNormal );
		$zObjectString = json_encode( $zObject );

		// Create the ZObject object to run validation and catch InvalidArgumentException errors
		try {
			$zObjectContent = ZObjectFactory::create( $zObject );
		} catch ( \InvalidArgumentException $e ) {
			// Error: Invalid ZObject
			return Status::newFatal( $e->getMessage() );
		}

		// Validate that $zid and zObject[Z2K1] are the same
		// TODO: replace ZObjectUtils::getZPersistentObjectId with ZObjectContent->getId()
		$zObjectId = ZObjectUtils::getZPersistentObjectId( $zObject );
		if ( $zObjectId !== $zid ) {
			return Status::newFatal( 'apierror-wikilambda_edit-unmatchingzid', $zid, $zObjectId );
		}

		// Find the label conflicts.
		// TODO: Once we fix ZObjectContent to save also the Z2 keys, we can get rid of these two
		// methods and simply use ZObjectContent->getLabels() and ZObjectContent->getType()
		$labels = ZObjectUtils::getZPersistentObjectLabels( $zObject );
		$ztype = ZObjectUtils::getZPersistentObjectType( $zObject );
		$clashes = $this->findZObjectLabelConflicts( $zid, $ztype, $labels );
		if ( count( $clashes ) > 0 ) {
			// Error: Found label conflicts
			$status = new Status();
			foreach ( $clashes as $language => $clash_zid ) {
				$status->fatal( 'wikilambda-labelclash', $clash_zid, $language );
			}
			return $status;
		}

		// Create the content object from the already validated text
		$title = $this->titleFactory->newFromText( $zid, NS_ZOBJECT );

		// Check that the requested title is a valid ZID, and MediaWiki doesn't complain about it
		if ( !( ZKey::isValidZObjectReference( $zid ) && $title instanceof Title && $title->canExist() ) ) {
			return Status::newFatal( 'wikilambda-invalidzobjecttitle', $zid );
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

		$page = $this->wikiPageFactory->newFromTitle( $title );
		$content = ZObjectContentHandler::makeContent( $zObjectString, $title );

		// Somehow we didn't get the right type back from ZObjectContentHandler. This is bad.
		if ( !( $content instanceof ZObjectContent ) ) {
			return Status::newFatal( 'wikilambda-invalidzobject' );
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

		try {
			$status = $page->doEditContent( $content, $summary, $flags, false, $user );
		} catch ( \Exception $e ) {
			// Error: Database or a deeper MediaWiki error, e.g. a general editing rate limit
			return Status::newFatal( $e->getMessage() );
		}

		if ( !$status->isOK() ) {
			// Error: Other doEditContent related errors
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
