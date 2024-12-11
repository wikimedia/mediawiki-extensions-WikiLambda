<?php
/**
 * WikiLambda Data Access Object service
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Exception;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\MediaWikiServices;
use MediaWiki\Page\WikiPageFactory;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Title\Title;
use MediaWiki\Title\TitleArrayFromResult;
use MediaWiki\Title\TitleFactory;
use MediaWiki\User\User;
use MediaWiki\User\UserGroupManager;
use MessageLocalizer;
use MWContentSerializationException;
use Psr\Log\LoggerInterface;
use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Rdbms\IExpression;
use Wikimedia\Rdbms\IResultWrapper;
use Wikimedia\Rdbms\LikeValue;
use Wikimedia\Rdbms\SelectQueryBuilder;
use Wikimedia\Rdbms\Subquery;
use WikiPage;

class ZObjectStore {

	private IConnectionProvider $dbProvider;
	private TitleFactory $titleFactory;
	private WikiPageFactory $wikiPageFactory;
	private RevisionStore $revisionStore;
	private UserGroupManager $userGroupManager;
	private LoggerInterface $logger;

	/**
	 * @param IConnectionProvider $dbProvider
	 * @param TitleFactory $titleFactory
	 * @param WikiPageFactory $wikiPageFactory
	 * @param RevisionStore $revisionStore
	 * @param UserGroupManager $userGroupManager
	 * @param LoggerInterface $logger
	 */
	public function __construct(
		IConnectionProvider $dbProvider,
		TitleFactory $titleFactory,
		WikiPageFactory $wikiPageFactory,
		RevisionStore $revisionStore,
		UserGroupManager $userGroupManager,
		LoggerInterface $logger
	) {
		$this->dbProvider = $dbProvider;
		$this->titleFactory = $titleFactory;
		$this->wikiPageFactory = $wikiPageFactory;
		$this->revisionStore = $revisionStore;
		$this->userGroupManager = $userGroupManager;
		$this->logger = $logger;
	}

	/**
	 * Find next available ZID in the database to create a new ZObject
	 *
	 * @return string Next available ZID
	 */
	public function getNextAvailableZid(): string {
		// Intentionally use DB_PRIMARY as we need the latest data here.
		$dbr = $this->dbProvider->getPrimaryDatabase();
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

		// NOTE: This hard-codes user-provided content as starting from 'Z10000'. Now that the
		// wiki has launched, change it will have unpredicatable effects.
		$highestZid = $res->numRows() > 0 ? $res->fetchRow()[ 0 ] : 'Z9999';
		$targetZid = 'Z' . ( max( intval( substr( $highestZid, 1 ) ) + 1, 10000 ) );

		return $targetZid;
	}

	/**
	 * Load a page revision from a given revision ID number.
	 * Returns null if no such revision can be found.
	 *
	 * @param int $id Revision ID of this revision
	 * @return RevisionRecord|null
	 */
	public function getRevisionById( int $id ) {
		$revisionRecord = $this->revisionStore->getRevisionById( $id );
		return $revisionRecord;
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
			$revision = $this->revisionStore->getRevisionByTitle( $title, $requestedRevision, 0 );
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
		$dbr = $this->dbProvider->getReplicaDatabase();
		$query = WikiPage::getQueryInfo();

		$res = $dbr->newSelectQueryBuilder()
			->select( $query['fields'] )
			->from( 'page' )
			->where( [
				'page_namespace' => NS_MAIN,
				'page_title' => $zids
			] )
			->caller( __METHOD__ )
			->fetchResultSet();

		$titleArray = new TitleArrayFromResult( $res );

		$dataArray = [];
		foreach ( $titleArray as $title ) {
			// TODO (T300521): Handle error from fetchZObjectByTitle
			$content = $this->fetchZObjectByTitle( $title );
			if ( $content->isValid() ) {
				$dataArray[ $title->getBaseText() ] = $content->getZObject();
			}
		}
		return $dataArray;
	}

	/**
	 * Push a given Object into the Database, without validation.
	 *
	 * @param string $zid
	 * @param string $data
	 * @param string $summary
	 * @return bool
	 * @throws Exception
	 */
	public function pushZObject( string $zid, string $data, string $summary ) {
		$title = $this->titleFactory->newFromText( $zid, NS_MAIN );
		// Error: Failed creating title due to invalid format
		if ( !$title ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_INVALID_TITLE,
					[ 'title' => $zid ]
				)
			);
		}

		$page = $this->wikiPageFactory->newFromTitle( $title );
		$flags = $title->exists() ? EDIT_UPDATE : EDIT_NEW;

		// Create system user:
		$creatingUserName = wfMessage( 'wikilambda-systemuser' )->inLanguage( 'en' )->text();
		$user = User::newSystemUser( $creatingUserName, [ 'steal' => true ] );
		$this->userGroupManager->addUserToGroup( $user, 'sysop' );
		$this->userGroupManager->addUserToGroup( $user, 'functionmaintainer' );
		$this->userGroupManager->addUserToGroup( $user, 'functioneer' );
		$this->userGroupManager->addUserToGroup( $user, 'wikifunctions-staff' );

		try {
			$content = ZObjectContentHandler::makeContent( $data, $title );
		} catch ( ZErrorException $e ) {
			// Make content should not fail unless the JSON is invalid
			$this->logger->warning(
				__METHOD__ . ' triggered an error on creating content for page "' . $zid . '"',
				[ 'responseError' => $e ]
			);
			throw $e;
		}

		try {
			$status = $page->doUserEditContent( $content, $user, $summary, $flags );
			// Error: Other doUserEditContent related errors
			if ( !$status->isOK() ) {
				$this->logger->info(
					__METHOD__ . ' got a non-OK Status on publish, for page "' . $zid . '"',
					[ 'responseStatus' => var_export( $status, true ) ]
				);
				throw new ZErrorException(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
						[ 'message' => (string)$status->getMessage() ]
					)
				);
			}
		} catch ( Exception $e ) {
			// Error: Database or a deeper MediaWiki error
			$this->logger->warning(
				__METHOD__ . ' triggered an error on publish for page "' . $zid . '"',
				[ 'responseError' => $e ]
			);
			throw $e;
		}
		return true;
	}

	/**
	 * Create a new ZObject, with a newly assigned ZID, and store it in the Database
	 *
	 * @param MessageLocalizer $context The context of the action operation, for localisation of messages
	 * @param string $data
	 * @param string $summary
	 * @param User $user
	 * @return ZObjectPage
	 */
	public function createNewZObject( MessageLocalizer $context, string $data, string $summary, User $user ) {
		// Find all placeholder ZIDs and ZKeys and replace those with the next available ZID
		$zid = $this->getNextAvailableZid();
		$zObjectString = ZObjectUtils::replaceNullReferencePlaceholder( $data, $zid );

		return $this->updateZObject( $context, $zid, $zObjectString, $summary, $user, EDIT_NEW );
	}

	/**
	 * Create or update a ZObject it in the Database
	 *
	 * @param MessageLocalizer $context The context of the action operation, for localisation of messages
	 * @param string $zid The ZID of the page to create/update, e.g. 'Z12345'
	 * @param string $data The ZObject's JSON to store, in string form, i.e. "{ Z1K1: "Z2", Z2K1: … }"
	 * @param string $summary An edit summary to display in the page's history, Recent Changes, watchlists, etc.
	 * @param User $user The user making the edit.
	 * @param int $flags Either EDIT_UPDATE (default) if editing or EDIT_NEW if creating a page
	 * @return ZObjectPage
	 */
	public function updateZObject(
		MessageLocalizer $context, string $zid, string $data, string $summary, User $user, int $flags = EDIT_UPDATE
	) {
		$title = $this->titleFactory->newFromText( $zid, NS_MAIN );

		// ERROR: Title is empty or invalid
		if ( !( $title instanceof Title ) ) {
			$error = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_INVALID_TITLE,
				[ 'title' => $zid ]
			);
			return ZObjectPage::newFatal( $error );
		}

		// If edit flag or title did not exist, we are creating a new object
		$creating = ( $flags === EDIT_NEW ) || !( $title->exists() );

		try {
			$content = ZObjectContentHandler::makeContent( $data, $title );
		} catch ( ZErrorException $e ) {
			return ZObjectPage::newFatal( $e->getZError() );
		} catch ( MWContentSerializationException $mwe ) {
			return ZObjectPage::newFatal(
				// We can't cleanly recover the inner ZErrorException (if indeed it was even thrown by us), so
				// for now just pass this down as a Z500, perhaps with the ErrorType as the message.
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
					[ 'message' => $mwe->getMessage() ]
				)
			);
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

		$ztype = $content->getZType();

		// Stop from creating and editing any types form DISALLOWED_ROOT_ZOBJECT
		if ( in_array( $ztype, ZTypeRegistry::DISALLOWED_ROOT_ZOBJECTS ) ) {
			$error = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_DISALLOWED_ROOT_ZOBJECT,
				[ 'data' => $content->getZType() ]
			);
			return ZObjectPage::newFatal( $error );
		}

		// Find the label conflicts.
		$labels = $content->getLabels()->getValueAsList();
		$clashes = $this->findZObjectLabelConflicts( $zid, $ztype, $labels );

		if ( count( $clashes ) > 0 ) {
			$error = ZErrorFactory::createLabelClashZErrors( $clashes );
			return ZObjectPage::newFatal( $error );
		}

		// Use ZObjectAuthorization service to check that the user has the required permissions
		// while creating or editing an object
		$fromContent = null;
		if ( !$creating ) {
			$currentRevision = $this->revisionStore->getKnownCurrentRevision( $title );
			$fromContent = $currentRevision->getSlots()->getContent( SlotRecord::MAIN );
			'@phan-var ZObjectContent $fromContent';
		}
		$authorizationService = WikiLambdaServices::getZObjectAuthorization();
		$status = $authorizationService->authorize( $fromContent, $content, $user, $title );

		// Return AuthorizationStatus->error if authorization service failed
		if ( !$status->isValid() ) {
			return ZObjectPage::newFatal( $status->getErrors() );
		}

		// Run ZObjectContent field validation
		try {
			$content->validateFields( $context );
		} catch ( ZErrorException $e ) {
			return ZObjectPage::newFatal( $e->getZError() );
		}

		// We prepare the content to be saved
		$page = $this->wikiPageFactory->newFromTitle( $title );
		try {
			$status = $page->doUserEditContent( $content, $user, $summary, $flags );
		} catch ( \Exception $e ) {
			// Error: Database or a deeper MediaWiki error, e.g. a general editing rate limit

			$this->logger->warning(
				__METHOD__ . ' triggered an error on publish, e.g. rate limited, for page "' . $zid . '"',
				[ 'responseError' => $e ]
			);

			$error = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				// TODO (T362236): Add the rendering language as a parameter, don't default to English
				[ 'message' => $e->getMessage() ]
			);
			return ZObjectPage::newFatal( $error );
		}

		if ( !$status->isOK() ) {

			// TODO (T362246): Dependency-inject
			$statusFormatter = MediaWikiServices::getInstance()->getFormatterFactory()
				->getStatusFormatter( $context );

			// Error: Other doUserEditContent related errors

			$this->logger->info(
				__METHOD__ . ' got a non-OK Status on publish, for page "' . $zid . '"',
				[ 'responseStatus' => var_export( $status, true ) ]
			);

			$error = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[ 'message' => $statusFormatter->getMessage( $status )->plain() ]
			);
			return ZObjectPage::newFatal( $error );
		}

		// Success: return WikiPage
		return ZObjectPage::newSuccess( $page );
	}

	/**
	 * Create or update a ZObject it in the Database as a System User
	 *
	 * @param MessageLocalizer $context The context of the action operation, for localisation of messages
	 * @param string $zid
	 * @param string $data
	 * @param string $summary
	 * @param int $flags
	 * @return ZObjectPage
	 */
	public function updateZObjectAsSystemUser(
		MessageLocalizer $context, string $zid, string $data, string $summary, int $flags = EDIT_UPDATE
	) {
		$creatingUserName = wfMessage( 'wikilambda-systemuser' )->inLanguage( 'en' )->text();
		// System user must belong to all privileged groups in order to
		// perform all zobject creation and editing actions:
		$user = User::newSystemUser( $creatingUserName, [ 'steal' => true ] );
		$this->userGroupManager->addUserToGroup( $user, 'sysop' );
		$this->userGroupManager->addUserToGroup( $user, 'functionmaintainer' );
		$this->userGroupManager->addUserToGroup( $user, 'functioneer' );
		$this->userGroupManager->addUserToGroup( $user, 'wikifunctions-staff' );
		return $this->updateZObject( $context, $zid, $data, $summary, $user, $flags );
	}

	/**
	 * Delete the labels from the wikilambda_zobject_labels database that correspond
	 * to the given ZID.
	 *
	 * @param string $zid
	 */
	public function deleteZObjectLabelsByZid( string $zid ) {
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newDeleteQueryBuilder()
			->deleteFrom( 'wikilambda_zobject_labels' )
			->where( [ 'wlzl_zobject_zid' => $zid ] )
			->caller( __METHOD__ )->execute();
	}

	/**
	 * Delete the label conflicts from the wikilambda_zobject_label_conflicts database
	 * that correspond to the given ZID.
	 *
	 * @param string $zid
	 */
	public function deleteZObjectLabelConflictsByZid( string $zid ) {
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newDeleteQueryBuilder()
			->deleteFrom( 'wikilambda_zobject_label_conflicts' )
			->where(
				$dbw->expr( 'wlzlc_existing_zid', '=', $zid )
					->or( 'wlzlc_conflicting_zid', '=', $zid )
			)
			->caller( __METHOD__ )->execute();
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
		$dbr = $this->dbProvider->getReplicaDatabase();

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
			$labelConflictConditions[] = $dbr->andExpr( [
				'wlzl_language' => $language,
				'wlzl_label' => $value,
				'wlzl_label_primary' => true
			] );
		}

		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid', 'wlzl_language' ] )
			->from( 'wikilambda_zobject_labels' )
			->where( [
				$dbr->expr( 'wlzl_zobject_zid', '!=', $zid ),
				// TODO (T357552): Check against type, once we properly implement that.
				// 'wlzl_type' => $ztype,
				$dbr->orExpr( $labelConflictConditions )
			] )
			->caller( __METHOD__ )
			->fetchResultSet();

		$conflicts = [];
		foreach ( $res as $row ) {
			// TODO (T362247): What if more than one conflicts with us on each language?
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
		$dbw = $this->dbProvider->getPrimaryDatabase();

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

		// Exit early if there are no updates to make.
		if ( count( $updates ) === 0 ) {
			return;
		}

		$dbw->newInsertQueryBuilder()
			->insertInto( 'wikilambda_zobject_labels' )
			->rows( $updates )
			->caller( __METHOD__ )->execute();
	}

	/**
	 * Insert language code into the wikilambda_zlanguages database for a given ZID
	 *
	 * @param string $zid
	 * @param string $languageCode
	 * @return void|bool
	 */
	public function insertZLanguageToLanguagesCache( string $zid, string $languageCode ) {
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newInsertQueryBuilder()
			->insertInto( 'wikilambda_zlanguages' )
			->row( [ 'wlzlangs_zid' => $zid, 'wlzlangs_language' => $languageCode ] )
			->caller( __METHOD__ )->execute();
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
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$updates = [];
		foreach ( $conflicts as $language => $existingZid ) {
			$updates[] = [
				'wlzlc_existing_zid' => $existingZid,
				'wlzlc_conflicting_zid' => $zid,
				'wlzlc_language' => $language,
			];
		}

		// Exit early if there are no updates to make.
		if ( count( $updates ) === 0 ) {
			return;
		}

		$dbw->newInsertQueryBuilder()
			->insertInto( 'wikilambda_zobject_label_conflicts' )
			->rows( $updates )
			->caller( __METHOD__ )->execute();
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
		$dbw = $this->dbProvider->getPrimaryDatabase();

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

		if ( count( $updates ) === 0 ) {
			return;
		}

		$dbw->newInsertQueryBuilder()
			->insertInto( 'wikilambda_zobject_labels' )
			->rows( $updates )
			->caller( __METHOD__ )->execute();
	}

	/**
	 * Gets from the secondary database a list of all Zids belonging to a given type
	 *
	 * @param string $ztype
	 * @return string[]
	 */
	public function fetchZidsOfType( $ztype ) {
		$dbr = $this->dbProvider->getReplicaDatabase();
		return $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid' ] )
			->distinct()
			->from( 'wikilambda_zobject_labels' )
			->where( [
				'wlzl_type' => $ztype
			] )
			->orderBy( 'wlzl_zobject_zid', SelectQueryBuilder::SORT_ASC )
			->caller( __METHOD__ )
			->fetchFieldValues();
	}

	/**
	 * Get a list of all Zids persisted in the database
	 *
	 * @return string[] All persisted Zids
	 */
	public function fetchAllZids() {
		$dbr = $this->dbProvider->getReplicaDatabase();
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
	 * Gets from the secondary database a list of all natural language ZIDs,
	 * mapping from BCP47 (or MediaWiki) language code to ZID (one zid can map
	 * to multiple BCP47 codes)
	 *
	 * @return array<string,string>
	 */
	public function fetchAllZLanguageObjects() {
		$dbr = $this->dbProvider->getReplicaDatabase();
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzlangs_zid', 'wlzlangs_language' ] )
			->distinct()
			->from( 'wikilambda_zlanguages' )
			->orderBy( 'wlzlangs_zid', SelectQueryBuilder::SORT_ASC )
			->caller( __METHOD__ )
			->fetchResultSet();

		$languages = [];
		foreach ( $res as $row ) {
			$languages[ $row->wlzlangs_language ] = $row->wlzlangs_zid;
		}
		return $languages;
	}

	/**
	 * Gets from the secondary database a list of all supported natural
	 * BCP47 (or MediaWiki) language codes.
	 *
	 * @return array<string>
	 */
	public function fetchAllZLanguageCodes() {
		return array_keys( $this->fetchAllZLanguageObjects() );
	}

	/**
	 * Gets from the secondary database the matching BCP47 (or MediaWiki) language code(s)
	 * for a given ZID
	 *
	 * @param string $zid The ZID of the matching ZLanguage object for which to search.
	 * @return string[] Any BCP47 (or MediaWiki) language code(s) if found; unordered.
	 */
	public function findCodesFromZLanguage( string $zid ) {
		$dbr = $this->dbProvider->getReplicaDatabase();
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzlangs_language' ] )
			->from( 'wikilambda_zlanguages' )
			->where( [ 'wlzlangs_zid' => $zid ], )
			->caller( __METHOD__ )
			->fetchResultSet();

		$codes = [];
		foreach ( $res as $row ) {
			$codes[] = (string)$row->wlzlangs_language;
		}
		return $codes;
	}

	/**
	 * Fetch all ZLanguages stored in the language cache table, and
	 * for each one, return its zid, its language code, and its label
	 * in the user language or the closest available fallback.
	 *
	 * @param string $userLang - User language BCP47 code
	 * @return IResultWrapper
	 */
	public function fetchAllZLanguagesWithLabels( $userLang ) {
		$dbr = $this->dbProvider->getReplicaDatabase();

		// TODO (T362246): Dependency-inject
		$zLangRegistry = ZLangRegistry::singleton();
		$languageFallback = MediaWikiServices::getInstance()->getLanguageFallback();
		$languages = $zLangRegistry->getListOfFallbackLanguageZids( $languageFallback, $userLang );

		// Returns table with unique zids and the most preferred primary label
		$subquery = $this->getPreferredLabelsQuery( $languages );
		return $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid', 'wlzl_label', 'wlzlangs_language' ] )
			->rawTables( [ 'preferred_labels' => new Subquery( $subquery ) ] )
			->join( 'wikilambda_zlanguages', null, [ 'wlzl_zobject_zid = wlzlangs_zid' ] )
			->orderBy( 'wlzl_label', SelectQueryBuilder::SORT_ASC )
			->caller( __METHOD__ )
			->fetchResultSet();
	}

	/**
	 * Fetch all ZTypes that have persisted instances, with their
	 * label in the user language or the closest available fallback.
	 *
	 * @param string $userLang - User language BCP47 code
	 * @return IResultWrapper
	 */
	public function fetchAllInstancedTypesWithLabels( $userLang ) {
		$dbr = $this->dbProvider->getReplicaDatabase();

		// TODO (T362246): Dependency-inject
		// Returns table with unique zids and the most preferred primary label
		$zLangRegistry = ZLangRegistry::singleton();
		$languageFallback = MediaWikiServices::getInstance()->getLanguageFallback();
		$languages = $zLangRegistry->getListOfFallbackLanguageZids( $languageFallback, $userLang );
		$subquery = $this->getPreferredLabelsQuery( $languages );

		// Fetch only those types that have instances
		$zids = $this->fetchAllInstancedTypes();

		return $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid', 'wlzl_label' ] )
			->rawTables( [ 'preferred_labels' => new Subquery( $subquery ) ] )
			->where( [ 'wlzl_zobject_zid' => $zids ] )
			->orderBy( 'wlzl_label', SelectQueryBuilder::SORT_ASC )
			->caller( __METHOD__ )
			->fetchResultSet();
	}

	/**
	 * Returns a list of distinct type Zids that have persisted instances.
	 *
	 * @return string[]
	 */
	public function fetchAllInstancedTypes() {
		$dbr = $this->dbProvider->getReplicaDatabase();

		return $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_type' ] )
			->distinct()
			->from( 'wikilambda_zobject_labels' )
			->caller( __METHOD__ )
			->fetchFieldValues();
	}

	/**
	 * Generates a query that filters to the preferred label in the
	 * labels table, depending on the user's language fallback chain
	 * passed as parameter.
	 *
	 * @param string[] $languageChain List of language zids in order of preference
	 * @return string
	 */
	public function getPreferredLabelsQuery( $languageChain ) {
		$dbr = $this->dbProvider->getReplicaDatabase();

		// Build the CASE statement to assign language preference index
		$caseParts = [];
		foreach ( $languageChain as $index => $langZid ) {
			$caseParts[] = "WHEN wlzl_language = " .
				$dbr->addQuotes( $langZid ) . " AND wlzl_label_primary = " .
				$dbr->addQuotes( true ) . " THEN " . ( $index + 1 );
		}
		$case = "CASE " . implode( " ", $caseParts ) . " ELSE " . ( count( $languageChain ) + 1 ) . " END";

		// Create subquery to assign priority order to the labels depending on the languageChain
		// TODO (T379560): Do this via SQLPlatform->selectSQLText() rather than raw SQL.
		$fields = [ '*', "ROW_NUMBER() OVER ( PARTITION BY wlzl_zobject_zid ORDER BY $case ) AS priority" ];
		$subquery = $dbr->selectSQLText( [ 'wikilambda_zobject_labels' ], $fields, '', __METHOD__ );

		// Create query to select the most prioritary label for each zid
		// - Join with zobject entries in the page table to order objects by creation date
		// - Select only those rows with label priority 1
		$pageJoinConditions = [
			'p.page_title = wlzl_zobject_zid',
			'p.page_content_model = ' . $dbr->addQuotes( CONTENT_MODEL_ZOBJECT )
		];
		$queryBuilder = $dbr->newSelectQueryBuilder()
			->select( [
				'page_id', 'wlzl_zobject_zid', 'wlzl_language', 'wlzl_label', 'wlzl_type',
				'wlzl_label_normalised', 'wlzl_label_primary', 'wlzl_return_type'
			] )
			->from( new Subquery( $subquery ), 'preferred_labels' )
			->leftJoin( 'page', 'p', $pageJoinConditions )
			->where( [ 'priority' => 1 ] );

		// Return SQL
		return $queryBuilder->getSQL();
	}

	/**
	 * Generates a query that returns a table with all the existing
	 * test objects, their function, and their status:
	 * * is_connected: whether the test is connected to the function
	 * * is_passing: whether the test is passing against all the
	 *   function's connected implementations
	 *
	 * @return string
	 */
	public function getTestStatusQuery() {
		$dbr = $this->dbProvider->getReplicaDatabase();

		$connQueryBuilder = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_related_zobject' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_key' => ZTypeRegistry::Z_FUNCTION_TESTERS ] );

		$resultsQueryBuilder = $dbr->newSelectQueryBuilder()
			->select( [ 'wlztr_ztester_zid', 'wlztr_pass' ] )
			->from( 'wikilambda_ztester_results' )
			->join( 'wikilambda_zobject_join', 'c2', 'c2.wlzo_related_zobject = wlztr_zimplementation_zid' );

		$queryBuilder = $dbr->newSelectQueryBuilder()
			->select( [
				'test_zid' => 'wlzf_ref_zid',
				'function_zid' => 'wlzf_zfunction_zid',
				'is_passing' => 'MIN( wlztr_pass )',
				'is_connected' => 'CASE WHEN wlzo_related_zobject IS NOT NULL THEN 1 ELSE 0 END',
				'all_tests' => 'COUNT(*) OVER( PARTITION BY wlzf_zfunction_zid )'
			] )
			->from( 'wikilambda_zobject_function_join' )
			->leftJoin( $connQueryBuilder, 'c1', 'c1.wlzo_related_zobject = wlzf_ref_zid' )
			->leftJoin( $resultsQueryBuilder, 'r1', 'r1.wlztr_ztester_zid = wlzf_ref_zid' )
			->where( [ 'wlzf_type' => ZTypeRegistry::Z_TESTER ] )
			->groupBy( [ 'wlzf_ref_zid', 'wlzf_zfunction_zid' ] );

		return $queryBuilder->getSQL();
	}

	/**
	 * Gets from the secondary database the ZID of a given BCP47 (or MediaWiki) language code
	 *
	 * @param string $code The BCP47 (or MediaWiki) language code for which to search
	 * @return ?string The ZID of the matching ZLanguage object, or null if not found.
	 */
	public function findZLanguageFromCode( string $code ) {
		$dbr = $this->dbProvider->getReplicaDatabase();
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzlangs_zid' ] )
			->from( 'wikilambda_zlanguages' )
			->where( [ 'wlzlangs_language' => $code ], )
			->caller( __METHOD__ )
			->fetchField();

		return $res ? (string)$res : null;
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
	 * @param int|null $limit Maximum number of results to return.
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
		$dbr = $this->dbProvider->getReplicaDatabase();

		$conditions = [];
		// Set language filter if any
		if ( count( $languages ) > 0 ) {
			$conditions['wlzl_language'] = $languages;
		}

		// Set type filter
		$typeConditions = [];
		if ( $type !== null ) {
			$typeConditions['wlzl_type'] = $type;
		}

		// Set returntype filter
		if ( $returnType !== null ) {
			$typeConditions['wlzl_return_type'] = [ $returnType ];
			if ( !$strictReturnType ) {
				$typeConditions['wlzl_return_type'][] = ZTypeRegistry::Z_OBJECT;
			}
		}

		// Set type conditions
		if ( count( $typeConditions ) > 0 ) {
			$conditions[] = $dbr->orExpr( $typeConditions );
		}

		// Set minimum id bound if we are continuing a paged result
		if ( $continue !== null ) {
			$conditions[] = $dbr->expr( 'wlzl_id', '>=', $continue );
		}

		// Set search Term and column
		if ( ZObjectUtils::isValidZObjectReference( $label ) ) {
			$searchedColumn = 'wlzl_zobject_zid';
			$searchTerm = $label;
		} elseif ( $exact ) {
			$searchedColumn = 'wlzl_label';
			$searchTerm = $label;
		} else {
			$searchedColumn = 'wlzl_label_normalised';
			$searchTerm = ZObjectUtils::comparableString( $label );
		}

		$conditions[] = $dbr->expr( $searchedColumn, IExpression::LIKE,
			new LikeValue( $dbr->anyString(), $searchTerm, $dbr->anyString() ) );

		// Create query builder
		$queryBuilder = $dbr->newSelectQueryBuilder()
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
			->orderBy( 'wlzl_label_primary', SelectQueryBuilder::SORT_DESC );

		// Set limit if not null
		if ( $limit ) {
			$queryBuilder->limit( $limit );
		}

		return $queryBuilder
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
		$dbr = $this->dbProvider->getReplicaDatabase();

		$conditions = [	'wlzl_zobject_zid' => $zid ];

		$zLangRegistry = ZLangRegistry::singleton();

		// Provided language code is not known, so fall back to English.
		$languageCode = $zLangRegistry->isLanguageKnownGivenCode( $languageCode ) ? $languageCode : 'en';
		$languageZid = $zLangRegistry->getLanguageZidFromCode( $languageCode );

		// Set language filter
		$languages = [ $languageZid ];
		if ( $fallback ) {
			// TODO (T362246): Dependency-inject
			$languageFallback = MediaWikiServices::getInstance()->getLanguageFallback();
			$languages = $zLangRegistry->getListOfFallbackLanguageZids( $languageFallback, $languageCode );
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
		$dbr = $this->dbProvider->getReplicaDatabase();
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
		$dbr = $this->dbProvider->getReplicaDatabase();
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
	 * @param int|null $limit Maximum number of results to return. Defaults to 10
	 * @return IResultWrapper
	 */
	public function findReferencedZObjectsByZFunctionId(
			$zid,
			$type,
			$continue = null,
			$limit = 10
		) {
		$dbr = $this->dbProvider->getReplicaDatabase();

		$conditions = [
			'wlzf_zfunction_zid' => $zid,
			'wlzf_type' => $type
		];

		// Set minimum id bound if we are continuing a paged result
		if ( $continue !== null ) {
			$conditions[] = $dbr->expr( 'wlzf_id', '>=', $continue );
		}
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzf_ref_zid', 'wlzf_id' ] )
			->from( 'wikilambda_zobject_function_join' )
			->where( $conditions )
			->orderBy( 'wlzf_id', SelectQueryBuilder::SORT_ASC )
			->limit( $limit )
			->caller( __METHOD__ )
			->fetchResultSet();

		return $res;
	}

	/**
	 * Fetch all objects of type Z14/Implementation persisted in the
	 * database, including connected, disconnected, labeled and unlabeled
	 * implementations.
	 *
	 * TODO (T287153): This method is only needed for the migrateZ16K1StringsToZ61s
	 * maintenance script, as using fetchZidsOfType(Z14) will not return
	 * those implementations that aren't labeled. Once we eliminate the
	 * maintenance script, we should remove this method, too.
	 *
	 * @return array
	 */
	public function fetchAllImplementations() {
		$dbr = $this->dbProvider->getReplicaDatabase();
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzf_ref_zid' ] )
			->distinct()
			->from( 'wikilambda_zobject_function_join' )
			->where( [
				'wlzf_type' => ZTypeRegistry::Z_IMPLEMENTATION
			] )
			->orderBy( 'wlzf_ref_zid', SelectQueryBuilder::SORT_ASC )
			->caller( __METHOD__ )
			->fetchResultSet();

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
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newInsertQueryBuilder()
			->insertInto( 'wikilambda_zobject_function_join' )
			->rows( [
				[
					'wlzf_ref_zid' => $refId,
					'wlzf_zfunction_zid' => $zFunctionId,
					'wlzf_type' => $type
				]
			] )
			->caller( __METHOD__ )->execute();
	}

	/**
	 * Remove a given ZObject ref from the secondary database
	 *
	 * @param string $refId the ZObject ID
	 * @return void
	 */
	public function deleteZFunctionReference( $refId ): void {
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newDeleteQueryBuilder()
			->deleteFrom( 'wikilambda_zobject_function_join' )
			->where( [ 'wlzf_ref_zid' => $refId ] )
			->caller( __METHOD__ )->execute();
	}

	/**
	 * For the given main ZObject and key, return the related ZObjects.
	 *
	 * Related ZObjects may be ZIDs or string encodings of
	 * compound ZObjects, such as "Z881(Z6)" for typed list of strings.
	 *
	 * @param string $mainZid ZID of the main ZObject
	 * @param string $key ZID of the key that indicates the relationship
	 * @return string[]
	 */
	public function findRelatedZObjectsByKeyAsList( $mainZid, $key ) {
		$res = $this->findRelatedZObjectsByKey( $mainZid, $key );
		$related = [];

		foreach ( $res as $row ) {
			$related[] = $row->wlzo_related_zobject;
		}
		return $related;
	}

	/**
	 * For the given main ZObject and key, return the related ZObjects.
	 *
	 * Related ZObjects may be ZIDs or string encodings of
	 * compound ZObjects, such as "Z881(Z6)" for typed list of strings.
	 *
	 * @param string $mainZid ZID of the main ZObject
	 * @param string $key ZID of the key that indicates the relationship
	 * @param string|null $continue Id to start. If null (the default), start from the first result.
	 * @param int|null $limit Maximum number of results to return. Defaults to 10
	 * @return IResultWrapper
	 */
	public function findRelatedZObjectsByKey( $mainZid, $key, $continue = null, $limit = 10 ) {
		$dbr = $this->dbProvider->getReplicaDatabase();

		$conditions = [
			'wlzo_main_zid' => $mainZid,
			'wlzo_key' => $key
		];

		// Set minimum id bound if we are continuing a paged result
		if ( $continue !== null ) {
			$conditions[] = $dbr->expr( 'wlzo_id', '>=', $continue );
		}
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_related_zobject', 'wlzo_id' ] )
			->from( 'wikilambda_zobject_join' )
			->where( $conditions )
			->orderBy( 'wlzo_id', SelectQueryBuilder::SORT_ASC )
			->limit( $limit )
			->caller( __METHOD__ )
			->fetchResultSet();

		return $res;
	}

	/**
	 * Add a batch of rows to the database describing the relation between
	 * a main ZObject and a related one, given by the connecting key.
	 *
	 * Example: [ 'Z401', 'Z8', 'Z8K2', 'Z881(Z6)', 'Z4' ]
	 * Indicates that the main object (Z401) of type function (Z8) has an output
	 * type (Z8K2) with value typed list of strings (Z881(Z6)) and type type (Z4)
	 *
	 * @param array $relatedZObjects Array of rows to insert into the table.
	 *   Each row must be an object with the non-empty properties zid, type, key,
	 *   related_zid and related_type
	 * @return void
	 */
	public function insertRelatedZObjects( $relatedZObjects ) {
		$rows = [];
		foreach ( $relatedZObjects as $zobject ) {
			$rows[] = [
				'wlzo_main_zid' => $zobject->zid,
				'wlzo_main_type' => $zobject->type,
				'wlzo_key' => $zobject->key,
				'wlzo_related_zobject' => $zobject->related_zid,
				'wlzo_related_type' => $zobject->related_type
			];
		}

		$dbw = $this->dbProvider->getPrimaryDatabase();
		$dbw->newInsertQueryBuilder()
			->insertInto( 'wikilambda_zobject_join' )
			->rows( $rows )
			->caller( __METHOD__ )
			->execute();
	}

	/**
	 * Delete all rows matching all of the non-null input values
	 *
	 * @param ?string $mainZid ZID of the main ZObject
	 * @param ?string $mainType ZID of the type of the main ZObject
	 * @param ?string $key ZID of a key indicating the relation between main and related ZObjects
	 * @param ?string $relatedZObject The related ZObject
	 * @param ?string $relatedType ZID of the type of the related ZObject
	 * @return void
	 */
	public function deleteRelatedZObjects(
		?string $mainZid,
		?string $mainType = null,
		?string $key = null,
		?string $relatedZObject = null,
		?string $relatedType = null
	) {
		$dbw = $this->dbProvider->getPrimaryDatabase();
		$conditions = [];
		if ( $mainZid !== null ) {
			$conditions['wlzo_main_zid'] = $mainZid;
		}
		if ( $mainType !== null ) {
			$conditions['wlzo_main_type'] = $mainType;
		}
		if ( $key !== null ) {
			$conditions['wlzo_key'] = $key;
		}
		if ( $relatedZObject !== null ) {
			$conditions['wlzo_related_zobject'] = $relatedZObject;
		}
		if ( $relatedType !== null ) {
			$conditions['wlzo_related_type'] = $relatedType;
		}

		$dbw->newDeleteQueryBuilder()
			->deleteFrom( 'wikilambda_zobject_join' )
			->where( $conditions )
			->caller( __METHOD__ )->execute();
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
		$dbr = $this->dbProvider->getReplicaDatabase();

		$purgeableResults = [];
		$conditions = [];
		if ( $functionZID !== null ) {
			$conditions['wlztr_zfunction_zid'] = $functionZID;
			$purgeableResults[] = $functionZID;
		}
		if ( $functionRevision !== null ) {
			$conditions['wlztr_zfunction_revision'] = $functionRevision;
		}
		if ( $implementationZID !== null ) {
			$conditions['wlztr_zimplementation_zid'] = $implementationZID;
			$purgeableResults[] = $implementationZID;
		}
		if ( $implementationRevision !== null ) {
			$conditions['wlztr_zimplementation_revision'] = $implementationRevision;
		}
		if ( $testerZID !== null ) {
			$conditions['wlztr_ztester_zid'] = $testerZID;
			$purgeableResults[] = $testerZID;
		}
		if ( $testerRevision !== null ) {
			$conditions['wlztr_ztester_revision'] = $testerRevision;
		}

		$res = $dbr->newSelectQueryBuilder()
			->select( [
				'wlztr_id',
				'wlztr_zfunction_zid', 'wlztr_zfunction_revision',
				'wlztr_zimplementation_zid', 'wlztr_zimplementation_revision',
				'wlztr_ztester_zid', 'wlztr_ztester_revision',
				'wlztr_pass',
				'wlztr_returnobject'
			] )
			->from( 'wikilambda_ztester_results' )
			->where( $conditions )
			->orderBy( 'wlztr_id', SelectQueryBuilder::SORT_DESC )
			->limit( 1 )
			->caller( __METHOD__ )
			->fetchResultSet();

		if ( $res->numRows() === 0 ) {
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
			$this->logger->error(
				__METHOD__ . ' retrieved a non-ZResponseEnvelope: ' . $responseObjectString,
				[ 'responseObject' => $responseObjectString ]
			);
		} catch ( \Throwable $th ) {
			// Something's gone differently wrong, somehow
			$this->logger->error(
				__METHOD__ . ' threw from ZObjectFactory: ' . $th->getMessage(),
				// Limit length to 10 KiB, to avoid jsonTruncated errors in production
				[ 'throwable' => substr( var_export( $th, true ), 0, 10240 ) ]
			);
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
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newInsertQueryBuilder()
			->insertInto( 'wikilambda_ztester_results' )
			->row( [
				'wlztr_zfunction_zid' => $functionZID,
				'wlztr_zfunction_revision' => $functionRevision,
				'wlztr_zimplementation_zid' => $implementationZID,
				'wlztr_zimplementation_revision' => $implementationRevision,
				'wlztr_ztester_zid' => $testerZID,
				'wlztr_ztester_revision' => $testerRevision,
				'wlztr_pass' => $testerResult,
				'wlztr_returnobject' => $testerResponse,
			] )
			->onDuplicateKeyUpdate()
			->uniqueIndexFields( [
				'wlztr_zfunction_revision',
				'wlztr_zimplementation_revision',
				'wlztr_ztester_revision'
			] )
			->set( [
				'wlztr_pass' => $testerResult,
				'wlztr_returnobject' => $testerResponse,
			] )
			->caller( __METHOD__ )->execute();

		return (bool)$dbw->affectedRows();
	}

	/**
	 * Remove a given ZFunction's results from the secondary tester results table.
	 *
	 * @param string $refId the ZID of the ZFunction whose results you wish to delete
	 * @return void
	 */
	public function deleteZFunctionFromZTesterResultsCache( string $refId ): void {
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newDeleteQueryBuilder()
			->deleteFrom( 'wikilambda_ztester_results' )
			->where( [ 'wlztr_zfunction_zid' => $refId ] )
			->caller( __METHOD__ )->execute();
	}

	/**
	 * Remove a given ZImplementation's results from the secondary tester results table.
	 *
	 * @param string $refId the ZID of the ZImplementation whose results you wish to delete
	 * @return void
	 */
	public function deleteZImplementationFromZTesterResultsCache( string $refId ): void {
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newDeleteQueryBuilder()
			->deleteFrom( 'wikilambda_ztester_results' )
			->where( [ 'wlztr_zimplementation_zid' => $refId ] )
			->caller( __METHOD__ )->execute();
	}

	/**
	 * Remove a given ZTester's results from the secondary tester results table.
	 *
	 * @param string $refId the ZID of the ZTester whose results you wish to delete
	 * @return void
	 */
	public function deleteZTesterFromZTesterResultsCache( string $refId ): void {
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newDeleteQueryBuilder()
			->deleteFrom( 'wikilambda_ztester_results' )
			->where( [ 'wlztr_ztester_zid' => $refId ] )
			->caller( __METHOD__ )->execute();
	}

	/**
	 * Remove a given ZNaturalLanguage's entry from the secondary languages table.
	 *
	 * @param string $zid the ZID of the ZNaturalLanguage you wish to delete
	 * @return void
	 */
	public function deleteZLanguageFromLanguagesCache( string $zid ): void {
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newDeleteQueryBuilder()
			->deleteFrom( 'wikilambda_zlanguages' )
			->where( [ 'wlzlangs_zid' => $zid ] )
			->caller( __METHOD__ )->execute();
	}
}
