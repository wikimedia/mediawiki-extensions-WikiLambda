<!--
	WikiLambda Vue root component to render the Default View

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-default-view">
		<div class="ext-wikilambda-row">
			<div class="ext-wikilambda-col ext-wikilambda-col-6 ext-wikilambda-col-tablet-24">
				<!-- Widget About -->
				<wl-about-widget
					:edit="edit"
					@edit-metadata="dispatchLoadEventForEditMetadataDialog"
				></wl-about-widget>

				<!-- Widget Function Explorer -->
				<wl-function-explorer-widget
					v-if="hasFunctionWidgets"
					:function-zid="targetFunctionZid"
					:edit="edit"
					:implementation="implementationMode"
				></wl-function-explorer-widget>
			</div>

			<div class="ext-wikilambda-col ext-wikilambda-col-12 ext-wikilambda-col-tablet-24">
				<!-- Persistent Object content block -->
				<div class="ext-wikilambda-content">
					<div class="ext-wikilambda-content-title">
						{{ $i18n( 'wikilambda-persistentzobject-contents' ).text() }}
					</div>
					<wl-z-object-key-value
						:skip-key="true"
						:skip-indent="true"
						:row-id="contentRowId"
						:edit="edit"
					></wl-z-object-key-value>
				</div>
			</div>

			<div class="ext-wikilambda-col ext-wikilambda-col-6 ext-wikilambda-col-tablet-24">
				<!-- Widget Publish Dialog -->
				<wl-publish-widget
					v-if="edit"
					:is-dirty="isDirty"
				></wl-publish-widget>

				<!-- Widget Function Report -->
				<wl-function-report-widget
					v-if="hasFunctionWidgets"
					:z-function-id="targetFunctionZid"
					:root-zid="persistentObjectZid"
					:report-type="contentType"
				></wl-function-report-widget>

				<!-- Widget Function Evaluator -->
				<wl-function-evaluator-widget
					v-if="hasFunctionWidgets"
					:function-zid="targetFunctionZid"
					:content-row-id="contentRowId"
					:for-implementation="isImplementationPage"
				></wl-function-evaluator-widget>
			</div>
		</div>
	</div>
</template>

<script>

var Constants = require( '../Constants.js' ),
	ZObjectKeyValue = require( '../components/default-view-types/ZObjectKeyValue.vue' ),
	FunctionEvaluatorWidget = require( '../components/widgets/FunctionEvaluator.vue' ),
	FunctionExplorerWidget = require( '../components/widgets/FunctionExplorer.vue' ),
	AboutWidget = require( '../components/widgets/About.vue' ),
	PublishWidget = require( '../components/widgets/Publish.vue' ),
	FunctionReportWidget = require( '../components/widgets/FunctionReport.vue' ),
	eventLogUtils = require( '../mixins/eventLogUtils.js' ),
	typeUtils = require( '../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-default-view',
	components: {
		'wl-about-widget': AboutWidget,
		'wl-publish-widget': PublishWidget,
		'wl-function-evaluator-widget': FunctionEvaluatorWidget,
		'wl-function-explorer-widget': FunctionExplorerWidget,
		'wl-function-report-widget': FunctionReportWidget,
		'wl-z-object-key-value': ZObjectKeyValue
	},
	mixins: [ eventLogUtils, typeUtils ],
	data: function () {
		return {};
	},
	computed: $.extend(
		mapGetters( [
			'getZObjectAsJson',
			'getZPersistentContentRowId',
			'getRowByKeyPath',
			'getViewMode',
			'getZObjectTypeByRowId',
			'getZImplementationContentType',
			'getZReferenceTerminalValue',
			'getZStringTerminalValue',
			'getRowByKeyPath',
			'isDirty',
			'isNewZObject',
			'getCurrentZObjectId',
			'getUserLangZid'
		] ), {
			/**
			 * Returns whether we are in an edit page according
			 * to the URL
			 *
			 * @return {boolean}
			 */
			edit: function () {
				return !this.getViewMode;
			},

			/**
			 * Returns the rowId where the persistent object content starts
			 *
			 * @return {number}
			 */
			contentRowId: function () {
				return this.getZPersistentContentRowId() || 0;
			},

			/**
			 * Returns the type of the content object
			 *
			 * @return {string}
			 */
			contentType: function () {
				return this.typeToString( this.getZObjectTypeByRowId( this.contentRowId ) );
			},

			/**
			 * Whether the page contains function widgets (is an
			 * implementation or a tester page)
			 *
			 * @return {boolean}
			 */
			hasFunctionWidgets: function () {
				return this.isImplementationPage || this.isTesterPage;
			},

			/**
			 * Whether the page is an implementation page
			 *
			 * @return {boolean}
			 */
			isImplementationPage: function () {
				return this.contentType === Constants.Z_IMPLEMENTATION;
			},

			/**
			 * Whether the page is an implementation page
			 *
			 * @return {boolean}
			 */
			isTesterPage: function () {
				return this.contentType === Constants.Z_TESTER;
			},

			/**
			 * @return {string|undefined}
			 */
			persistentObjectZid: function () {
				const row = this.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_ID ], 0 );
				return row ? this.getZStringTerminalValue( row.id ) : undefined;
			},

			/**
			 * @return {number|undefined}
			 */
			targetFunctionRowId: function () {
				let key;
				if ( this.contentType === Constants.Z_IMPLEMENTATION ) {
					key = Constants.Z_IMPLEMENTATION_FUNCTION;
				} else if ( this.contentType === Constants.Z_TESTER ) {
					key = Constants.Z_TESTER_FUNCTION;
				} else {
					return undefined;
				}
				const row = this.getRowByKeyPath( [ key ], this.contentRowId );
				return row ? row.id : undefined;
			},

			/**
			 * @return {string|undefined}
			 */
			targetFunctionZid: function () {
				return this.getZReferenceTerminalValue( this.targetFunctionRowId );
			},

			/**
			 * @return {string|undefined}
			 */
			implementationMode: function () {
				if ( this.contentType === Constants.Z_IMPLEMENTATION ) {
					return this.getZImplementationContentType( this.contentRowId );
				}
			}
		}
	),
	methods: {
		/**
		 * Dispatch event (via Metrics Platform) to record loading this view,
		 * or opening the about-edit-metadata-dialog.
		 * This event indicates that the user is either (a) viewing a ZObject,
		 * (b) starting to create a new one, or (c) starting to edit an existing one.
		 * For case (a) editValue should be false; otherwise true.
		 *
		 * @param {string} editValue
		 */
		dispatchLoadEvent: function ( editValue ) {
			this.dispatchEvent( 'wf.ui.defaultView.load', {
				edit: editValue,
				zobjecttype: this.contentType || null,
				isnewzobject: this.isNewZObject,
				zobjectid: this.getCurrentZObjectId || null,
				zlang: this.getUserLangZid || null
			} );
		},
		/**
		 * This method handles a click of the edit-icon in the About widget. If this.edit = false,
		 * we regard this click as the beginning of an edit journey of the current ZObject. But if
		 * we are already in edit mode (this.edit = true), this journey has already begun and the
		 * appropriate event has already been dispatched.
		 * TODO (T352141): Consider counting "About info" editing separately
		 */
		dispatchLoadEventForEditMetadataDialog: function () {
			if ( !this.edit ) {
				this.dispatchLoadEvent( true );
			}
		}
	},
	mounted: function () {
		this.dispatchLoadEvent( this.edit );
		this.$emit( 'mounted' );
	}
};
</script>

<style lang="less">
@import '../ext.wikilambda.edit.less';

.ext-wikilambda-content {
	box-sizing: border-box;
	padding: @spacing-75;
	border: 1px solid #c8ccd1;
	border-radius: 2px;
	margin-bottom: @spacing-100;

	.ext-wikilambda-content-title {
		font-weight: @font-weight-bold;
		margin-bottom: @spacing-125;
	}

	> .ext-wikilambda-key-value-row {
		> .ext-wikilambda-key-value {
			> .ext-wikilambda-key-value-main__no-indent {
				> .ext-wikilambda-value-block {
					> .ext-wikilambda-key-value-set.ext-wikilambda-key-level-1 {
						margin-left: 0;
					}
				}
			}
		}
	}
}

.ext-wikilambda-widget {
	box-sizing: border-box;
	padding: @spacing-75;
	border: 1px solid #c8ccd1;
	border-radius: 2px;
	margin-bottom: @spacing-100;

	&.ext-wikilambda-widget-json {
		padding: 0;
	}
}

.ext-wikilambda-row {
	display: flex;
	flex-wrap: wrap;
	margin-left: -@spacing-75;
	margin-right: -@spacing-75;
}

.ext-wikilambda-col {
	box-sizing: border-box;
	padding-left: @spacing-75;
	padding-right: @spacing-75;
	flex-grow: 1;
	min-width: 0;
}

.generate-columns(@index) when (@index <= 24) {
	.ext-wikilambda-col-@{index} {
		flex-basis: calc( 100% / 24 * @index );
		max-width: calc( 100% / 24 * @index );
	}

	.generate-responsive-columns( @index, mobile );
	.generate-responsive-columns( @index, tablet );
	.generate-responsive-columns( @index, desktop );

	.generate-columns( @index + 1 );
}

.generate-responsive-columns(@index, @size) {
	@media ( max-width: ~'@{max-width-breakpoint-@{size}}' ) {
		.ext-wikilambda-col-@{size}-@{index} {
			flex-basis: calc( 100% / 24 * @index );
			max-width: calc( 100% / 24 * @index );
		}
	}
}

.generate-columns( 1 );
</style>
