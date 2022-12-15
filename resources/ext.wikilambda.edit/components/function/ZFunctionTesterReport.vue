<template>
	<!--
		WikiLambda Vue component for displaying the results of running testers against a function's implementations.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<h2>{{ $i18n( 'wikilambda-tester-results-title' ).text() }}</h2>
		<template v-if="zFunctionId && implementations.length > 0 && testers.length > 0">
			<table
				class="ext-wikilambda-fn-tester-results"
			>
				<caption>{{ $i18n( 'wikilambda-tester-results-caption' ) }}</caption>
				<thead>
					<tr>
						<th scope="col"></th>
						<th
							v-for="implementation in implementations"
							:key="implementation"
							class="ext-wikilambda-fn-tester-results__header-cell"
							scope="col"
						>
							{{ getZkeyLabels[ implementation ] ||
								$i18n( 'wikilambda-tester-results-current-implementation' ).text()
							}}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="( test, index ) in testers" :key="index"
						class="ext-wikilambda-fn-tester-results__row">
						<template v-if="typeof test === 'string'">
							<th scope="row">
								{{ getZkeyLabels[ test ] || $i18n( 'wikilambda-tester-results-current-test' ).text() }}
							</th>
							<td v-for="implementation in implementations" :key="implementation">
								<z-tester-impl-result
									:z-function-id="zFunctionId"
									:z-implementation-id="implementation"
									:z-tester-id="test"
									@set-keys="setActiveTesterKeys"
								></z-tester-impl-result>
							</td>
						</template>
						<!-- FIXME T314469: The template for the else clause should treat tester literal objects
						differently, as they will not be persistent objects but objects of type Z20/Tester -->
						<template v-else>
							<th scope="row">
								{{ test.Z2K3.Z12K1[ 0 ].Z11K2.Z6K1 }}
							</th>
							<td v-for="implementation in implementations" :key="implementation">
								<z-tester-impl-result
									:z-function-id="zFunctionId"
									:z-implementation-id="implementation"
									:z-tester-id="test[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ]"
									@set-keys="setActiveTesterKeys"
								></z-tester-impl-result>
							</td>
						</template>
					</tr>
				</tbody>
				<tfoot>
					<tr>
						<td>
							<slot name="run-testers" :click="runTesters">
								<cdx-button v-if="!getViewMode" @click="runTesters">
									{{ $i18n( 'wikilambda-tester-run-testers' ).text() }}
								</cdx-button>
							</slot>
						</td>
						<td :colspan="implementations.length" class="ext-wikilambda-fn-tester-result">
							{{ $i18n( 'wikilambda-tester-results-percentage-label' ).text() }}:
							{{ resultCount.passing }}/{{ resultCount.total }} ({{ resultCount.percentage }}%)
						</td>
					</tr>
				</tfoot>
			</table>
			<!-- eslint-disable vue/no-v-model-argument -->
			<!-- eslint-disable vue/no-unsupported-features -->
			<cdx-dialog
				v-model:open="showMetrics"
				:title="$i18n( 'wikilambda-functioncall-metadata-dialog-header' ).text()"
				:close-button-label="Close"
			>
				<strong> {{ implementationLabel }}</strong>
				<br>
				<strong> {{ testerLabel }}</strong>
				<div class="ext-wikilambda-metadatadialog-helplink">
					<cdx-icon :icon="helpLinkIcon()"></cdx-icon>
					<a
						:title="tooltipMetaDataHelpLink"
						href="https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Wikifunctions/Function_call_metadata"
						target="_blank">
						{{ $i18n( 'wikilambda-helplink-button' ).text() }}
					</a>
				</div>
				<span v-if="( activeZTesterId || activeZImplementationId )"></span>
			</cdx-dialog>
		</template>
		<div v-else>
			<p>{{ $i18n( 'wikilambda-tester-no-results' ).text() }}</p>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	schemata = require( '../../mixins/schemata.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxDialog = require( '@wikimedia/codex' ).CdxDialog,
	icons = require( '../../../lib/icons.json' ),
	ZTesterImplResult = require( './ZTesterImplResult.vue' ),
	portray = require( '../../mixins/portray.js' );

// @vue/component
module.exports = exports = {
	components: {
		'z-tester-impl-result': ZTesterImplResult,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'cdx-dialog': CdxDialog
	},
	mixins: [ typeUtils, schemata, portray ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zFunctionId: {
			type: String,
			required: true
		},
		zImplementationId: {
			type: String,
			default: null
		},
		zTesterId: {
			type: String,
			default: null
		}
	},
	data: function () {
		return {
			activeZImplementationId: null,
			activeZTesterId: null,
			Constants: Constants,
			showMetrics: false
		};
	},
	computed: $.extend( mapGetters( [
		'getZkeyLabels',
		'getZkeys',
		'getZTesterPercentage',
		'getCurrentZObjectId',
		'getNewTesterZObjects',
		'getZTesterResults',
		'getZTesterMetadata',
		'getViewMode',
		'getZImplementations',
		'getZTesters'
	] ), {
		implementations: function () {
			if ( !this.zFunctionId || !this.getZkeys[ this.zFunctionId ] ) {
				return [];
			}

			if ( this.zImplementationId ) {
				return [ this.zImplementationId ];
			} else {
				const fetched = this.getZkeys[ this.zFunctionId ][
					Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_IMPLEMENTATIONS ];
				// Slice off the first item in the canonical form array; this is a string representing the type.
				return Array.isArray( fetched ) ? fetched.slice( 1 ) : [];
			}
		},
		testers: function () {
			if ( !this.zFunctionId || !this.getZkeys[ this.zFunctionId ] ) {
				return [];
			}

			if ( this.zTesterId ) {
				return [ this.zTesterId ];
			} else {
				const fetched = this.getZkeys[ this.zFunctionId ][
					Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_TESTERS ];
				// Slice off the first item in the canonical form array; this is a string representing the type.
				return Array.isArray( fetched ) ? fetched.slice( 1 ) : [];
			}
		},
		resultCount: function () {
			return this.getZTesterPercentage( this.zFunctionId );
		},
		activeTesterStatus: function () {
			return this.getZTesterResults(
				this.zFunctionId,
				this.activeZTesterId,
				this.activeZImplementationId
			) === true ?
				this.$i18n( 'wikilambda-tester-status-passed' ).text() :
				this.$i18n( 'wikilambda-tester-status-failed' ).text();
		},
		dialogText: function () {
			if ( !this.activeZTesterId || !this.activeZImplementationId ) {
				return '';
			}
			const metadata = this.getZTesterMetadata(
				this.zFunctionId, this.activeZTesterId, this.activeZImplementationId );
			// Ensure ZIDs appearing in metadata have been fetched
			const metadataZIDs = this.extractZIDs( metadata );
			this.fetchZKeys( { zids: metadataZIDs } );
			return this.portrayMetadataMap( metadata, this.getZkeyLabels );
		},
		testerLabel: function () {
			return !this.activeZTesterId ? '' : this.getZkeyLabels[ this.activeZTesterId ] ||
				( this.getNewTesterZObjects && this.getNewTesterZObjects.Z2K3.Z12K1[ 0 ].Z11K2.Z6K1 );
		},
		implementationLabel: function () {
			return !this.activeZImplementationId ? '' : this.getZkeyLabels[ this.activeZImplementationId ];
		},
		tooltipMetaDataHelpLink: function () {
			return this.$i18n( 'wikilambda-helplink-tooltip' ).text();
		}
	} ),
	methods: $.extend( mapActions( [ 'fetchZKeys', 'getTestResults' ] ), {
		runTesters: function () {
			this.getTestResults( {
				zFunctionId: this.zFunctionId,
				zImplementations: this.implementations,
				zTesters: this.testers,
				clearPreviousResults: true
			} );
		},
		setActiveTesterKeys: function ( keys ) {
			this.activeZImplementationId = keys.zImplementationId;
			this.activeZTesterId = keys.zTesterId;
			this.showMetrics = true;
		},
		helpLinkIcon: function () {
			return icons.cdxIconHelpNotice;
		}
	} ),
	watch: {
		implementations: function ( newValue, oldValue ) {
			if ( newValue.length !== oldValue.length ) {
				this.fetchZKeys( { zids: this.implementations } );
			}
		},
		testers: function ( newValue, oldValue ) {
			if ( newValue.length !== oldValue.length ) {
				this.fetchZKeys( { zids: this.testers } );
			}
		}
	},
	mounted: function () {
		this.fetchZKeys( { zids: this.implementations.concat( this.testers ) } )
			.then( function () {
				setTimeout( this.runTesters, 1000 );
			}.bind( this ) );
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-fn-tester-results {
	border-spacing: 10px 5px;
	max-width: 90vw;
	overflow-x: auto;
}

.ext-wikilambda-fn-tester-results caption {
	white-space: nowrap;
}

.ext-wikilambda-fn-tester-results tfoot td.ext-wikilambda-fn-tester-result {
	padding: 10px 0;
	border-top: 3px double #000;
	text-align: right;
}

.ext-wikilambda-metadatadialog-helplink {
	float: right;
}
</style>
