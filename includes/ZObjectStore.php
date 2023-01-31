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

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\MediaWikiServices;
use MediaWiki\Page\WikiPageFactory;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\Revision\SlotRecord;
use Title;
use TitleArray;
use TitleFactory;
use User;
use Wikimedia\Rdbms\IDatabase;
use Wikimedia\Rdbms\ILoadBalancer;
use Wikimedia\Rdbms\IResultWrapper;
use Wikimedia\Rdbms\SelectQueryBuilder;
use WikiPage;

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
	public function getNextAvailableZid(): string {
		// Intentionally use DB_PRIMARY as we need the latest data here.
		$dbr = $this->loadBalancer->getConnectionRef( DB_PRIMARY );
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'page_title' ] )
			 ->from( 'page' )
			 ->where( [
				 'page_namespace' => NS_MAIN,
				 'LENGTH( page_title ) > 5'
			 ] )
			 ->orderBy( 'page_id', SelectQueryBuilder::SORT_DESC )
			 ->groupBy( [ 'page_id', 'page_title' ] )
			 ->limit( 1 )
			 ->caller( __METHOD__ )
			 ->fetchResultSet();

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
	 * @param Title $title The ZObject to fetch
	 * @param int|null $requestedRevision The revision ID of the page to fetch. If unset, the latest is returned.
	 * @return ZObjectContent|bool Found ZObject
	 */
	public function fetchZObjectByTitle( Title $title, ?int $requestedRevision = null ) {
		if ( $requestedRevision ) {
			$revision = $this->revisionStore->getRevisionById( $requestedRevision, 0, $title );
		} else {
			$revision = $this->revisionStore->getKnownCurrentRevision( $title );
		}

		if ( !$revision ) {
			// TODO (T300521): Handle errors by creating and returning Z5
			return false;
		}

		// NOTE: Hard-coding use of MAIN slot; if we're going the MCR route, we may wish to change this (or not).
		$slot = $revision->getSlot( SlotRecord::MAIN, RevisionRecord::RAW );
		// @phan-suppress-next-line PhanTypeMismatchReturnSuperType
		return $slot->getContent();
	}

	/**
	 * Returns an array of ZPersistentObjects fetched from the DB given an array of their Zids
	 *
	 * Note that this will only fetch the latest revision of a ZObject; if you want a specific
	 * revision, you need to use ZObjectStore::fetchZObjectByTitle() instead.
	 *
	 * @param string[] $zids
	 * @return ZPersistentObject[]
	 */
	public function fetchBatchZObjects( $zids ) {
		$dbr = $this->loadBalancer->getConnectionRef( DB_REPLICA );
		$query = WikiPage::getQueryInfo();
		$options = [];

		$res = $dbr->newSelectQueryBuilder()
			 ->select( $query['fields'] )
			 ->from( 'page' )
			 ->where( [
				 'page_namespace' => NS_MAIN,
				 'page_title' => $zids
			 ] )
			 ->caller( __METHOD__ )
			 ->fetchResultSet();

		$titleArray = TitleArray::newFromResult( $res );

		$dataArray = [];
		foreach ( $titleArray as $title ) {
			// TODO (T300521) Handle error from fetchZObjectByTitle
			$content = $this->fetchZObjectByTitle( $title );
			if ( $content->isValid() ) {
				$dataArray[ $title->getBaseText() ] = $content->getZObject();
			}
		}
		return $dataArray;
	}

	/**
	 * Create a new ZObject, with a newly assigned ZID, and store it in the Database
	 *
	 * @param string $data
	 * @param string $summary
	 * @param User $user
	 * @return ZObjectPage
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
	 * @return ZObjectPage
	 */
	public function updateZObject( string $zid, string $data, string $summary, User $user, int $flags = EDIT_UPDATE ) {
		$title = $this->titleFactory->newFromText( $zid, NS_MAIN );

		$creating = ( $flags === EDIT_NEW );

		if ( !( $title instanceof Title ) ) {
			$error = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_INVALID_TITLE,
				[ 'title' => $zid ]
			);
			return ZObjectPage::newFatal( $error );
		}

		try {
			$content = ZObjectContentHandler::makeContent( $data, $title );
		} catch ( ZErrorException $e ) {
			return ZObjectPage::newFatal( $e->getZError() );
		}

		// Error: ZObject validation errors.
		if ( !( $content->isValid() ) ) {
			return ZObjectPage::newFatal( $content->getErrors() );
		}

		// Validate that $zid and zObject[Z2K1] are the same
		$zObjectId = $content->getZid();
		if ( $zObjectId !== $zid ) {
			$error = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNMATCHING_ZID,
				[
					'zid' => $zObjectId,
					'title' => $zid
				]
			);
			return ZObjectPage::newFatal( $error );
		}

		// Find the label conflicts.
		$labels = $content->getLabels()->getValueAsList();
		$ztype = $content->getZType();
		$clashes = $this->findZObjectLabelConflicts( $zid, $ztype, $labels );

		if ( count( $clashes ) > 0 ) {
			$error = ZErrorFactory::createLabelClashZErrors( $clashes );
			return ZObjectPage::newFatal( $error );
		}

		// Check that the user has the permissions to make the edit they're attempting

		// TODO (T312090): This should use the Authority concept, not the soon-to-be-legacy PermissionManager.
		$permissionManager = MediaWikiServices::getInstance()->getPermissionManager();

		if ( !( $title->exists() ) ) {
			if (
				!$permissionManager->userCan( 'edit', $user, $title ) ||
				!$permissionManager->userCan( 'wikilambda-create', $user, $title )
			) {
				// User is trying to create a page and is prohibited, e.g. logged-out.
				$error = ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT,
					[ 'message' => wfMessage( 'nocreatetext' )->text() ]
				);
				return ZObjectPage::newFatal( $error );
			}
		} else {
			if (
				!$permissionManager->userCan( 'edit', $user, $title ) ||
				!$permissionManager->userCan( 'wikilambda-edit', $user, $title )
			) {
				// User is trying to edit a page and is prohibited, e.g. blocked, but we don't know why,
				// so give them the most generic error that MediaWiki has.
				$error = ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT,
					[ 'message' => wfMessage( 'badaccess-group0' )->text() ]
				);
				return ZObjectPage::newFatal( $error );
			}
		}

		// Prohibit certain kinds of edit to regular users; system users are allowed to edit anything, as
		// otherwise the initial content injection / etc. would fail.
		if ( !$user->isSystemUser() ) {
			// (T278175) Prohibit certain kinds of ZTypes from being instantiated as top-level wiki pages
			if (
				in_array( $ztype, ZTypeRegistry::DISALLOWED_ROOT_ZOBJECTS )
				// We only care at creation time; edits (e.g. label changes) are OK.
				&& !$title->exists()
			) {
				$error = ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_DISALLOWED_ROOT_ZOBJECT,
					[ 'data' => $ztype ]
				);
				return ZObjectPage::newFatal( $error );
			}

			// TODO: (T303338) Allow the edit anyway if it's just adjusting the labels of a ZObject

			// Don't allow creates or edits to "pre-defined" ZObjecst (where ZID < 10,000)
			if (
				substr( $zObjectId, 1 ) < 10000 &&
				!$permissionManager->userCan(
					( $creating ? 'wikilambda-create-predefined' : 'wikilambda-edit-predefined' ),
					$user,
					$title
				)
			) {
				$error = ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT,
					// TODO: Custom error message?
					[ 'message' => wfMessage( 'nocreatetext' )->text() ]
				);
				return ZObjectPage::newFatal( $error );
			}

			// TODO (T275940): Check the user has the right for certain kinds of edit to certain kinds of type
			// (e.g. limits on creation of Z60/Natural language, Z61/Programming language, …; limits on edits
			// on built-in items)
		}

		// We prepare the content to be saved
		$page = $this->wikiPageFactory->newFromTitle( $title );
		try {
			$status = $page->doUserEditContent( $content, $user, $summary, $flags );
		} catch ( \Exception $e ) {
			// Error: Database or a deeper MediaWiki error, e.g. a general editing rate limit
			$error = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[ 'message' => $e->getMessage() ]
			);
			return ZObjectPage::newFatal( $error );
		}

		if ( !$status->isOK() ) {
			// Error: Other doUserEditContent related errors
			$error = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[ 'message' => $status->getMessage() ]
			);
			return ZObjectPage::newFatal( $error );
		}

		// Success: return WikiPage
		return ZObjectPage::newSuccess( $page );
	}

	/**
	 * Create or update a ZObject it in the Database as a System User
	 *
	 * @param string $zid
	 * @param string $data
	 * @param string $summary
	 * @param int $flags
	 * @return ZObjectPage
	 */
	public function updateZObjectAsSystemUser( string $zid, string $data, string $summary, int $flags = EDIT_UPDATE ) {
		$creatingUserName = wfMessage( 'wikilambda-systemuser' )->inLanguage( 'en' )->text();
		$user = User::newSystemUser( $creatingUserName, [ 'steal' => true ] );
		return $this->updateZObject( $zid, $data, $summary, $user, $flags );
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

		// remove labels with an undefined value
		$labels = array_filter(
			$labels, static function ( $value ) {
				return $value !== "";
			} );

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

		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzl_zobject_zid', 'wlzl_language' ] )
			 ->from( 'wikilambda_zobject_labels' )
			 ->where( [
				 'wlzl_zobject_zid != ' . $dbr->addQuotes( $zid ),
				 // TODO: Check against type, once we properly implement that.
				 // 'wlzl_type' => $dbr->addQuotes( $ztype ),
				 $dbr->makeList( $labelConflictConditions, $dbr::LIST_OR )
			 ] )
			 ->caller( __METHOD__ )
			 ->fetchResultSet();

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
	 * @param string|null $returnType
	 * @return void|bool
	 */
	public function insertZObjectLabels( $zid, $ztype, $labels, $returnType = null ) {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );

		$updates = [];
		foreach ( $labels as $language => $value ) {
			$updates[] = [
				'wlzl_zobject_zid' => $zid,
				'wlzl_language' => $language,
				'wlzl_type' => $ztype,
				'wlzl_label' => $value,
				'wlzl_label_normalised' => ZObjectUtils::comparableString( $value ),
				'wlzl_label_primary' => true,
				'wlzl_return_type' => $returnType
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
	 * @param string|null $returnType
	 * @return void|bool
	 */
	public function insertZObjectAliases( $zid, $ztype, $aliases, $returnType = null ) {
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
					'wlzl_label_primary' => false,
					'wlzl_return_type' => $returnType
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
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzl_zobject_zid' ] )
			 ->from( 'wikilambda_zobject_labels' )
			 ->where( [
				 'wlzl_type' => $ztype
			 ] )
			 ->orderBy( 'wlzl_zobject_zid', SelectQueryBuilder::SORT_ASC )
			 ->caller( __METHOD__ )
			 ->fetchResultSet();

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
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'page_title' ] )
			 ->from( 'page' )
			 ->where( [
				 'page_namespace' => NS_MAIN
			 ] )
			 ->caller( __METHOD__ )
			 ->fetchResultSet();

		$zids = [];
		foreach ( $res as $row ) {
			$zid = $row->page_title;
			if ( ZObjectUtils::isValidZObjectReference( $zid ) ) {
				$zids[] = $zid;
			}
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
	 * @param string|null $returnType Zid of the return type to filter by. If null, don't filter by return type.
	 * @param bool $strictReturnType Whether to exclude Z1s as return type.
	 * @param string|null $continue Id to start. If null, start from the first result.
	 * @param int $limit Maximum number of results to return.
	 * @return IResultWrapper
	 */
	public function searchZObjectLabels(
		$label,
		$exact,
		$languages,
		$type,
		$returnType,
		$strictReturnType,
		$continue,
		$limit
	) {
		$dbr = $this->loadBalancer->getConnectionRef( DB_REPLICA );

		// Set language filter
		$conditions = [ 'wlzl_language' => $languages ];

		// Set primary labels only, no aliases.
		// TODO(T323930): Include alias labels again once FE styling is implemented.
		$conditions[ 'wlzl_label_primary' ] = '1';

		// Set type filter
		$typeConditions = [];
		if ( $type != null ) {
			$typeConditions[] = 'wlzl_type = ' . $dbr->addQuotes( $type );
		}

		// Set returntype filter
		if ( $returnType != null ) {
			$typeConditions[] = 'wlzl_return_type = ' . $dbr->addQuotes( $returnType );
			if ( !$strictReturnType ) {
				$typeConditions[] = 'wlzl_return_type = ' . $dbr->addQuotes( ZTypeRegistry::Z_OBJECT );
			}
		}

		// Set type conditions
		if ( count( $typeConditions ) > 0 ) {
			$conditions[] = $dbr->makeList( $typeConditions, $dbr::LIST_OR );
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
		return $dbr->newSelectQueryBuilder()
			 ->select( [
				 'wlzl_zobject_zid',
				 'wlzl_type',
				 'wlzl_return_type',
				 'wlzl_language',
				 'wlzl_label',
				 'wlzl_label_primary',
				 'wlzl_id'
			 ] )
			 ->from( 'wikilambda_zobject_labels' )
			 ->where( $conditions )
			 ->orderBy( 'wlzl_id', SelectQueryBuilder::SORT_ASC )
			 ->limit( $limit )
			 ->caller( __METHOD__ )
			 ->fetchResultSet();
	}

	/**
	 * Fetch the label in the secondary database for a given object by Zid, in a given language.
	 * Returns null if no labels are found in the given language or any other language in that
	 * language's fallback chain, including English (Z1002). If the language code given is not
	 * recognised, this will fall back to returning the English label, if available.
	 *
	 * @param string $zid Term to search in the label database
	 * @param string $languageCode Code of the language in which to fetch the label
	 * @param bool $fallback Whether to only match in the given language, or use
	 *   the language fallback change (default behaviour).
	 * @return string|null
	 */
	public function fetchZObjectLabel( $zid, $languageCode, $fallback = true ) {
		$dbr = $this->loadBalancer->getConnectionRef( DB_REPLICA );

		$conditions = [	'wlzl_zobject_zid' => $zid ];

		$zLangRegistry = ZLangRegistry::singleton();

		// Provided language code is not known, so fall back to English.
		$languageCode = $zLangRegistry->isLanguageKnownGivenCode( $languageCode ) ? $languageCode : 'en';
		$languageZid = $zLangRegistry->getLanguageZidFromCode( $languageCode );

		// Set language filter
		$languages = [ $languageZid ];
		if ( $fallback ) {
			$fallbackLanguages = MediaWikiServices::getInstance()->getLanguageFallback()->getAll(
				$languageCode,
				// Note: We intentionally fall all the way back to English as this will likely be the most
				// common entry language, and so doing this will result in a marginally better UX behaviour
				// for the circumstance where no label exists.
				LanguageFallback::MESSAGES
			);

			foreach ( $fallbackLanguages as $index => $languageCode ) {
				$languages[] = $zLangRegistry->getLanguageZidFromCode( $languageCode );
			}
		}
		$conditions[ 'wlzl_language' ] = $languages;

		// We only want primary labels, not aliases
		$conditions[ 'wlzl_label_primary' ] = '1';

		$res = $dbr->newSelectQueryBuilder()
			 ->select( [
				 'wlzl_zobject_zid',
				 'wlzl_language',
				 'wlzl_label'
			 ] )
			 ->from( 'wikilambda_zobject_labels' )
			 ->where( $conditions )
			 ->orderBy( 'wlzl_id', SelectQueryBuilder::SORT_ASC )
			 // Hard-coded performance limit just in case there's a very long / circular language fallback chain.
			 ->limit( 5 )
			 ->caller( __METHOD__ )
			 ->fetchResultSet();

		// No hits at all; allow callers to give a fallback message or trigger a DB fetch if they want.
		if ( $res->numRows() === 0 ) {
			return null;
		}

		// Collapse labels into a simple array
		$labels = [];
		foreach ( $res as $row ) {
			$labels[$row->wlzl_language] = $row->wlzl_label;
		}

		// Walk the labels in order of the language chain, so that language preference is preserved
		foreach ( $languages as $index => $languageZid ) {
			if ( array_key_exists( $languageZid, $labels ) ) {
				return $labels[ $languageZid ];
			}
		}

		// Somehow we've reached this point without a hit? Oh well.
		return null;
	}

	/**
	 * Get the return type of a given Function Zid or null if not available
	 *
	 * @param string $zid
	 * @return string|null
	 */
	public function fetchZFunctionReturnType( $zid ) {
		$dbr = $this->loadBalancer->getConnectionRef( DB_REPLICA );
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzl_return_type' ] )
			 ->from( 'wikilambda_zobject_labels' )
			 ->where( [
				 'wlzl_zobject_zid' => $zid,
				 'wlzl_type' => ZTypeRegistry::Z_FUNCTION,
			 ] )
			 ->limit( 1 )
			 ->caller( __METHOD__ )
			 ->fetchField();

		return $res ? (string)$res : null;
	}

	/**
	 * Search implementations in the secondary database, return the first one
	 * This function is primarily used for the example API request
	 *
	 * @return string
	 */
	public function findFirstZImplementationFunction(): string {
		$dbr = $this->loadBalancer->getConnectionRef( DB_REPLICA );
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzf_zfunction_zid' ] )
			 ->from( 'wikilambda_zobject_function_join' )
			 ->where( [
				 'wlzf_type' => ZTypeRegistry::Z_IMPLEMENTATION,
			 ] )
			 ->limit( 1 )
			 ->caller( __METHOD__ )
			 ->fetchField();

		return $res ? (string)$res : '';
	}

	/**
	 * Converts findReferencedZObjectsByZFunctionId into a list of zids
	 *
	 * @param string $zid the ZID of the ZFunction
	 * @param string $type the type of the ZFunction reference
	 * @return string[] All ZIDs of referenced ZObjects associated to the ZFunction
	 */
	public function findReferencedZObjectsByZFunctionIdAsList(
		$zid,
		$type
	) {
		$res = $this->findReferencedZObjectsByZFunctionId( $zid, $type );
		$zids = [];
		foreach ( $res as $row ) {
			$zids[] = $row->wlzf_ref_zid;
		}

		return $zids;
	}

	/**
	 * Search implementations in the secondary database and return all matching a given ZID
	 *
	 * @param string $zid the ZID of the ZFunction
	 * @param string $type the type of the ZFunction reference
	 * @param string|null $continue Id to start. If null (the default), start from the first result.
	 * @param int $limit Maximum number of results to return. Defaults to 10
	 * @return IResultWrapper
	 */
	public function findReferencedZObjectsByZFunctionId(
			$zid,
			$type,
			$continue = null,
			$limit = 10
		) {
		$dbr = $this->loadBalancer->getConnectionRef( DB_REPLICA );

		$conditions = [
			'wlzf_zfunction_zid' => $zid,
			'wlzf_type' => $type
		];

		// Set minimum id bound if we are continuing a paged result
		if ( $continue != null ) {
			$conditions[] = "wlzf_id >= $continue";
		}
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_function_join',
			/* SELECT */ [ 'wlzf_ref_zid', 'wlzf_id' ],
			/* WHERE */ $dbr->makeList( $conditions, $dbr::LIST_AND ),
			__METHOD__,
			[
				'ORDER BY' => 'wlzf_id ASC',
				'LIMIT' => $limit,
			]
		);

		return $res;
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

	/**
	 * Search test run results in the secondary tester results table; the latest result (highest
	 * database ID) will be used.
	 *
	 * @param ?string $functionZID The ZID of the ZFunction
	 * @param ?int $functionRevision The revision ID of the ZFunction
	 * @param ?string $implementationZID The ZID of the ZImplementation
	 * @param ?int $implementationRevision The revision ID of the ZImplementation
	 * @param ?string $testerZID The ZID of the ZTester
	 * @param ?int $testerRevision The revision ID of the ZTester
	 * @return ?ZResponseEnvelope
	 */
	public function findZTesterResult(
		?string $functionZID,
		?int $functionRevision,
		?string $implementationZID,
		?int $implementationRevision,
		?string $testerZID,
		?int $testerRevision
	) {
		$dbr = $this->loadBalancer->getConnection( DB_REPLICA );

		$purgeableResults = [];
		$conditions = [];
		if ( $functionZID !== null ) {
			$conditions[] = "wlztr_zfunction_zid = " . $dbr->addQuotes( $functionZID );
			$purgeableResults[] = $functionZID;
		}
		if ( $functionRevision !== null ) {
			$conditions[] = "wlztr_zfunction_revision = " . $dbr->addQuotes( $functionRevision );
		}
		if ( $implementationZID !== null ) {
			$conditions[] = "wlztr_zimplementation_zid = " . $dbr->addQuotes( $implementationZID );
			$purgeableResults[] = $implementationZID;
		}
		if ( $implementationRevision !== null ) {
			$conditions[] = "wlztr_zimplementation_revision = " . $dbr->addQuotes( $implementationRevision );
		}
		if ( $testerZID !== null ) {
			$conditions[] = "wlztr_ztester_zid = " . $dbr->addQuotes( $testerZID );
			$purgeableResults[] = $testerZID;
		}
		if ( $testerRevision !== null ) {
			$conditions[] = "wlztr_ztester_revision = " . $dbr->addQuotes( $testerRevision );
		}

		$res = $dbr->select(
			/* FROM */ 'wikilambda_ztester_results',
			/* SELECT */ [
				'wlztr_id',
				'wlztr_zfunction_zid', 'wlztr_zfunction_revision',
				'wlztr_zimplementation_zid', 'wlztr_zimplementation_revision',
				'wlztr_ztester_zid', 'wlztr_ztester_revision',
				'wlztr_pass',
				'wlztr_returnobject'
			],
			/* WHERE */ $dbr->makeList( $conditions, $dbr::LIST_AND ),
			__METHOD__,
			[
				'ORDER BY' => 'wlztr_id DESC',
				'LIMIT' => 1,
			]
		);

		if ( $res->numRows() == 0 ) {
			return null;
		}

		$result = $res->fetchRow();
		try {
			$responseObjectString = $result['wlztr_returnobject'];
			$responseObject = ZObjectFactory::create( json_decode( $responseObjectString ) );
			if ( $responseObject instanceof ZResponseEnvelope ) {
				return $responseObject;
			}

			// Something's gone wrong, somehow
			wfDebug( __METHOD__ . ' retrieved a non-ZResponseEnvelope: ' . $responseObjectString );
		} catch ( \Throwable $th ) {
			// Something's gone differently wrong, somehow
			wfDebug( __METHOD__ . ' threw from ZObjectFactory.' );
		}

		return null;
	}

	/**
	 * Cache a test run result in the secondary tester results table
	 *
	 * @param string $functionZID The ZID of the ZFunction
	 * @param int $functionRevision The revision ID of the ZFunction
	 * @param string $implementationZID The ZID of the ZImplementation
	 * @param int $implementationRevision The revision ID of the ZImplementation
	 * @param string $testerZID The ZID of the ZTester
	 * @param int $testerRevision The revision ID of the ZTester
	 * @param bool $testerResult Whether the test run passed (true) or failed (false)
	 * @param string $testerResponse The test run response JSON object
	 * @return bool
	 */
	public function insertZTesterResult(
		string $functionZID,
		int $functionRevision,
		string $implementationZID,
		int $implementationRevision,
		string $testerZID,
		int $testerRevision,
		bool $testerResult,
		string $testerResponse
	): bool {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );

		$dbw->upsert(
			'wikilambda_ztester_results',
			[
				'wlztr_zfunction_zid' => $functionZID,
				'wlztr_zfunction_revision' => $functionRevision,
				'wlztr_zimplementation_zid' => $implementationZID,
				'wlztr_zimplementation_revision' => $implementationRevision,
				'wlztr_ztester_zid' => $testerZID,
				'wlztr_ztester_revision' => $testerRevision,
				'wlztr_pass' => $testerResult,
				'wlztr_returnobject' => $testerResponse,
			],
			[
				[
					'wlztr_zfunction_revision',
					'wlztr_zimplementation_revision',
					'wlztr_ztester_revision'

				]
			],
			[
				'wlztr_pass' => $testerResult,
				'wlztr_returnobject' => $testerResponse,
			],
			__METHOD__
		);

		return (bool)$dbw->affectedRows();
	}

	/**
	 * Remove a given ZFunction's results from the secondary tester results table.
	 *
	 * @param string $refId the ZID of the ZFunction whose results you wish to delete
	 * @return void
	 */
	public function deleteZFunctionFromZTesterResultsCache( string $refId ): void {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );

		$dbw->delete(
			'wikilambda_ztester_results',
			[ 'wlztr_zfunction_zid' => $refId ],
			__METHOD__
		);
	}

	/**
	 * Remove a given ZImplementation's results from the secondary tester results table.
	 *
	 * @param string $refId the ZID of the ZImplementation whose results you wish to delete
	 * @return void
	 */
	public function deleteZImplementationFromZTesterResultsCache( string $refId ): void {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );

		$dbw->delete(
			'wikilambda_ztester_results',
			[ 'wlztr_zimplementation_zid' => $refId ],
			__METHOD__
		);
	}

	/**
	 * Remove a given ZTester's results from the secondary tester results table.
	 *
	 * @param string $refId the ZID of the ZTester whose results you wish to delete
	 * @return void
	 */
	public function deleteZTesterFromZTesterResultsCache( string $refId ): void {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );

		$dbw->delete(
			'wikilambda_ztester_results',
			[ 'wlztr_ztester_zid' => $refId ],
			__METHOD__
		);
	}

	/**
	 * Delete data related to the given zids from the secondary labels table.
	 * This method is only for its use by reloadBuiltinData with the --force flag.
	 *
	 * @param string[] $zids list of zids to clear
	 * @return void
	 */
	public function deleteFromLabelsSecondaryTables( array $zids ): void {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );
		$dbw->delete(
			/* FROM */ 'wikilambda_zobject_labels',
			/* WHERE */ [ 'wlzl_zobject_zid' => $zids ],
			__METHOD__
		);
		$dbw->delete(
			/* FROM */'wikilambda_zobject_label_conflicts',
			/* WHERE */ [ 'wlzlc_existing_zid' => $zids ],
			__METHOD__
		);
	}

	/**
	 * Delete data related to the given zids from the secondary function joins table.
	 * This method is only for its use by reloadBuiltinData with the --force flag.
	 *
	 * @param string[] $zids list of zids to clear
	 * @return void
	 */
	public function deleteFromFunctionsSecondaryTables( array $zids ): void {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );
		$dbw->delete(
			/* FROM */ 'wikilambda_zobject_function_join',
			/* WHERE */ $dbw->makeList(
				[
					'wlzf_zfunction_zid' => $zids,
					'wlzf_ref_zid' => $zids
				],
				$dbw::LIST_OR
			),
			__METHOD__
		);
	}

	/**
	 * Delete data related to the given zids from the secondary tester results table.
	 * This method is only for its use by reloadBuiltinData with the --force flag.
	 *
	 * @param string[] $zids list of zids to clear
	 * @return void
	 */
	public function deleteFromTesterResultsSecondaryTables( array $zids ): void {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );
		$dbw->delete(
			/* FROM */ 'wikilambda_ztester_results',
			/* WHERE */ $dbw->makeList(
				[
					'wlztr_zfunction_zid' => $zids,
					'wlztr_zimplementation_zid' => $zids,
					'wlztr_ztester_zid' => $zids
				],
				$dbw::LIST_OR
			),
			__METHOD__
		);
	}

	/**
	 * Clear all data from the secondary labels table. This method
	 * is only for its use by reloadBuiltinData with the --force flag.
	 *
	 * @return void
	 */
	public function clearLabelsSecondaryTables(): void {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );
		$dbw->delete( 'wikilambda_zobject_labels', IDatabase::ALL_ROWS, __METHOD__ );
		$dbw->delete( 'wikilambda_zobject_label_conflicts', IDatabase::ALL_ROWS, __METHOD__ );
	}

	/**
	 * Clear all data from the secondary function joins table. This method
	 * is only for its use by reloadBuiltinData with the --force flag.
	 *
	 * @return void
	 */
	public function clearFunctionsSecondaryTables(): void {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );
		$dbw->delete( 'wikilambda_zobject_function_join', IDatabase::ALL_ROWS, __METHOD__ );
	}

	/**
	 * Clear all data from the secondary tester results table. This method
	 * is only for its use by reloadBuiltinData with the --force flag.
	 *
	 * @return void
	 */
	public function clearTesterResultsSecondaryTables(): void {
		$dbw = $this->loadBalancer->getConnectionRef( DB_PRIMARY );
		$dbw->delete( 'wikilambda_ztester_results', IDatabase::ALL_ROWS, __METHOD__ );
	}

}
