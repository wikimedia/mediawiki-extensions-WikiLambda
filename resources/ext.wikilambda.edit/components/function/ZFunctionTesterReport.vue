<template>
	<!--
		WikiLambda Vue component for displaying the results of running testers against a function's implementations.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-tester-report">
		<h2>{{ $i18n( 'wikilambda-tester-results-title' ).text() }}</h2>
		<div
			v-if="zFunctionId && implementations.length > 0 && testers.length > 0"
			class="ext-wikilambda-function-tester-report__content"
		>
			<div class="ext-wikilambda-function-tester-report__header">
				<!-- TODO (T326665): use codex component when it exists -->
				<span class="ext-wikilambda-function-tester-report__title"> {{ title }} </span>
				<cdx-button :aria-label="reloadLabel" weight="quiet">
					<cdx-icon
						:icon="reloadIcon"
						@click.stop="runTesters"
					></cdx-icon>
				</cdx-button>
			</div>
			<div
				v-for="item in zIds"
				:key="item"
				class="ext-wikilambda-function-tester-report__container"
			>
				<wl-z-tester-impl-result
					class="ext-wikilambda-function-tester-report__result"
					:z-function-id="zFunctionId"
					:z-implementation-id="reportType === Constants.Z_TESTER ? item : zImplementationId"
					:z-tester-id="reportType === Constants.Z_TESTER ? zTesterId : item"
					:report-type="reportType"
					@set-keys="setActiveTesterKeys"
				></wl-z-tester-impl-result>
				<wl-metadata-dialog
					:show-dialog="showMetrics"
					:implementation-label="activeImplementationLabel"
					:tester-label="activeTesterLabel"
					:metadata="metadata"
					@close-dialog="showMetrics = false"
				></wl-metadata-dialog>
			</div>
		</div>
		<div v-else>
			<p> {{ $i18n( 'wikilambda-tester-no-results' ).text() }} </p>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' ),
	MetadataDialog = require( './viewer/details/ZMetadataDialog.vue' ),
	ZTesterImplResult = require( './ZTesterImplResult.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-function-tester-report',
	components: {
		'wl-z-tester-impl-result': ZTesterImplResult,
		'wl-metadata-dialog': MetadataDialog,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		reportType: {
			type: String,
			default: Constants.Z_FUNCTION
		},
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
			showMetrics: false,
			Constants: Constants
		};
	},
	computed: $.extend( mapGetters( [
		'getZkeyLabels',
		'getZkeys',
		'getZTesterPercentage',
		'getZTesterMetadata',
		'getViewMode',
		'getZTesters',
		'getZImplementations',
		'getFetchingTestResults'
	] ), {
		title: function () {
			return this.reportType === Constants.Z_TESTER ?
				this.$i18n( 'wikilambda-function-implementation-table-header' ).text() :
				this.$i18n( 'wikilambda-function-test-cases-table-header' ).text();
		},
		zIds: function () {
			return this.reportType === Constants.Z_TESTER ? this.implementations : this.testers;
		},
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
		metadata: function () {
			if ( !this.activeZTesterId || !this.activeZImplementationId ) {
				return '';
			}
			return this.getZTesterMetadata(
				this.zFunctionId, this.activeZTesterId, this.activeZImplementationId );
		},
		activeTesterLabel: function () {
			return !this.activeZTesterId ? '' : ( this.getZkeyLabels[ this.activeZTesterId ] || this.activeZTesterId );
		},
		activeImplementationLabel: function () {
			return !this.activeZImplementationId ? '' : ( this.getZkeyLabels[ this.activeZImplementationId ] || this.activeZImplementationId );
		},
		reloadIcon: function () {
			return this.getFetchingTestResults ? icons.cdxIconCancel : icons.cdxIconReload;
		},
		reloadLabel: function () {
			return this.getFetchingTestResults ?
				this.$i18n( 'wikilambda-tester-status-cancel' ).text() :
				this.$i18n( 'wikilambda-tester-status-run' ).text();
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
		implementationLabel: function ( implementation ) {
			return this.zImplementationId ?
				this.$i18n( 'wikilambda-tester-results-current-implementation' ).text() :
				( this.getZkeyLabels[ implementation ] || implementation );
		},
		testLabel: function ( test ) {
			return this.zTesterId ?
				this.$i18n( 'wikilambda-tester-results-current-test' ).text() :
				( this.getZkeyLabels[ test ] || test );
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
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-function-tester-report {
	&__content {
		border: 1px solid @background-color-disabled;
		padding: @spacing-75;
		margin: @spacing-100 0;
	}

	&__title {
		font-weight: bold;
	}

	&__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: calc( @spacing-125 - @spacing-35 );

		> button {
			margin-top: -@spacing-35; // (32px button - 20px icon) / 2
			margin-right: -@spacing-35;
		}
	}

	&__container {
		margin-bottom: @spacing-50;

		&:last-child {
			margin-bottom: 0;
		}
	}
}
</style>
