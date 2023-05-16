<template>
	<!--
		WikiLambda Vue root component to render the Default View

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-default-view">
		<div class="ext-wikilambda-row">
			<div class="ext-wikilambda-col ext-wikilambda-col-6 ext-wikilambda-col-tablet-24">
				<!-- Widget About -->
				<wl-about-widget
					:edit="edit"
				></wl-about-widget>

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
						:hide-key="true"
						:row-id="contentRowId"
						:edit="edit"
					></wl-z-object-key-value>
				</div>
			</div>

			<div class="ext-wikilambda-col ext-wikilambda-col-6 ext-wikilambda-col-tablet-24">
				<!-- Widget Publish Dialog -->
				<wl-publish-widget v-if="edit"></wl-publish-widget>

				<!-- Widget Function Report -->
				<wl-function-report-widget
					v-if="hasFunctionWidgets"
					:z-function-id="targetFunctionZid"
					:root-zid="persistentObjectZid"
					:report-type="contentType"
				></wl-function-report-widget>

				<!-- Widget ZObject JSON -->
				<div class="ext-wikilambda-widget ext-wikilambda-widget-json">
					<wl-z-object-json
						:readonly="true"
						:zobject-raw="getZObjectAsJson"
					></wl-z-object-json>
				</div>
			</div>
		</div>
	</div>
</template>

<script>

var Constants = require( '../Constants.js' ),
	ZObjectKeyValue = require( '../components/default-view-types/ZObjectKeyValue.vue' ),
	ZObjectJson = require( '../components/ZObjectJson.vue' ),
	FunctionExplorerWidget = require( '../components/widgets/FunctionExplorer.vue' ),
	AboutWidget = require( '../components/widgets/About.vue' ),
	PublishWidget = require( '../components/widgets/Publish.vue' ),
	FunctionReportWidget = require( '../components/widgets/FunctionReport.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-default-view',
	components: {
		'wl-about-widget': AboutWidget,
		'wl-publish-widget': PublishWidget,
		'wl-function-explorer-widget': FunctionExplorerWidget,
		'wl-function-report-widget': FunctionReportWidget,
		'wl-z-object-key-value': ZObjectKeyValue,
		'wl-z-object-json': ZObjectJson
	},
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
			'getRowByKeyPath'
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
				return this.getZObjectTypeByRowId( this.contentRowId );
			},

			/**
			 * @return {boolean}
			 */
			hasFunctionWidgets: function () {
				return (
					( this.contentType === Constants.Z_IMPLEMENTATION ) ||
					( this.contentType === Constants.Z_TESTER )
				);
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
	)
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
