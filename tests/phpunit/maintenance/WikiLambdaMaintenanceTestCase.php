<?php

/**
 * WikiLambda maintenance test abstract class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Maintenance;

use FilesystemIterator;
use MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks;
use MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry;
use MediaWiki\Tests\Maintenance\MaintenanceBaseTestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RuntimeException;

abstract class WikiLambdaMaintenanceTestCase extends MaintenanceBaseTestCase {

	/** @var string[] Full paths to fixture directories created via makeTempDumpDir() */
	private array $cleanupTempDirs = [];

	/**
	 * Set configuration flag WikiLambdaEnableRepoMode to true and
	 * register the Z504 ZErrorType to avoid unbounded fallback recursion.
	 */
	protected function setUpAsRepoMode(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		RepoHooks::registerExtension();

		// Always register Z504, as otherwise we get an infinite recursion of not finding Z504
		$this->insertZids( [ 'Z504' ] );
	}

	/**
	 * Inserts the given ZObjects from the function-schemata data definitions directory.
	 *
	 * @param string[] $zids
	 */
	protected function insertZids( array $zids ): void {
		foreach ( $zids as $zid ) {
			$data = self::getDefinition( $zid );
			$this->editPage( $zid, $data, 'Test ZObject creation', NS_MAIN );
		}
	}

	/**
	 * Look up a built-in ZObject definition by ZID.
	 *
	 * @param string $zid
	 * @return string
	 */
	private static function getDefinition( string $zid ): string {
		$mainFile = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions' . "/$zid.json";
		if ( !file_exists( $mainFile ) ) {
			throw new RuntimeException( "ZObject definition for $zid not found." );
		}
		return file_get_contents( $mainFile );
	}

	/**
	 * Create a fresh fixture directory inside the WikiLambda extension tree.
	 *
	 * Both loadJsonDump and loadAbstractDump compute their dump path as
	 * dirname( __DIR__ ) . '/' . $dumpDir, so fixtures must live under the
	 * extension root rather than in wfTempDir(). The directory is removed
	 * recursively in tearDown(), even if the test fails mid-way through.
	 *
	 * @return string Full filesystem path to the new directory.
	 */
	protected function makeTempDumpDir(): string {
		// dirname(__DIR__, 3) resolves to the extension root (extensions/WikiLambda/),
		// matching the dirname(__DIR__) in maintenance/load*Dump.php so the script
		// and the test write to / read from the same place.
		$path = dirname( __DIR__, 3 ) . '/phpunit-dump-' . wfRandomString( 8 );
		mkdir( $path, 0o755, true );
		$this->cleanupTempDirs[] = $path;
		return $path;
	}

	protected function tearDown(): void {
		foreach ( $this->cleanupTempDirs as $dir ) {
			$this->removeDirRecursively( $dir );
		}
		$this->cleanupTempDirs = [];
		ZObjectRegistry::clearAll();
		parent::tearDown();
	}

	private function removeDirRecursively( string $dir ): void {
		if ( !is_dir( $dir ) ) {
			return;
		}
		$iter = new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator( $dir, FilesystemIterator::SKIP_DOTS ),
			RecursiveIteratorIterator::CHILD_FIRST
		);
		foreach ( $iter as $file ) {
			$file->isDir() ? rmdir( $file->getPathname() ) : unlink( $file->getPathname() );
		}
		rmdir( $dir );
	}
}
