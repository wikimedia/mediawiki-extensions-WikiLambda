<template>
	<!--
		WikiLambda Vue component for displaying the results of running
		a function's testers against its implementations or a funciton's
		implementations against its testers.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<wl-widget-base
		class="ext-wikilambda-function-report"
		:has-header-action="hasItems"
	>
		<!-- Widget header -->
		<template #header>
			{{ title }}
		</template>
		<template #header-action>
			<cdx-button
				weight="quiet"
				:aria-label="reloadLabel"
				@click="runTesters"
			>
				<cdx-icon :icon="reloadIcon"></cdx-icon>
			</cdx-button>
		</template>

		<!-- Widget main -->
		<template #main>
			<div v-if="hasItems">
				<div
					v-for="item in zIds"
					:key="item"
					class="ext-wikilambda-function-report__items"
				>
					<wl-function-report-item
						class="ext-wikilambda-function-report__result"
						:z-function-id="zFunctionId"
						:z-implementation-id="reportType === Constants.Z_TESTER ? item : zImplementationId"
						:z-tester-id="reportType === Constants.Z_TESTER ? zTesterId : item"
						:report-type="reportType"
						@set-keys="setActiveTesterKeys"
					></wl-function-report-item>
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
		</template>
	</wl-widget-base>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' ),
	// TODO move
	WidgetBase = require( '../base/WidgetBase.vue' ),
	MetadataDialog = require( '../function/viewer/details/ZMetadataDialog.vue' ),
	FunctionReportItem = require( './FunctionReportItem.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-report-widget',
	components: {
		'wl-function-report-item': FunctionReportItem,
		'wl-metadata-dialog': MetadataDialog,
		'wl-widget-base': WidgetBase,
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
		rootZid: {
			type: String,
			required: true
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
		'getFetchingTestResults'
	] ), {
		hasItems: function () {
			return (
				this.zFunctionId &&
				this.implementations.length > 0 &&
				this.testers.length > 0
			);
		},
		zImplementationId: function () {
			return ( this.reportType === Constants.Z_IMPLEMENTATION ) ? this.rootZid : null;
		},
		zTesterId: function () {
			return ( this.reportType === Constants.Z_TESTER ) ? this.rootZid : null;
		},
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

.ext-wikilambda-function-report {
	&__items {
		margin-bottom: @spacing-50;

		&:last-child {
			margin-bottom: 0;
		}
	}

	.cdx-card__text__description {
		.ext-wikilambda-function-report-item-status {
			&--PASS {
				color: @color-success;
			}

			&--FAIL {
				color: @color-error;
			}

			&--RUNNING {
				color: @color-warning;
			}
		}
	}
}
</style>
