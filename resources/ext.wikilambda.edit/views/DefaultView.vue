<template>
	<!--
		WikiLambda Vue root component to render the Default View

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<!-- Widget ZObject Labels -->
		<wl-about-widget
			:edit="edit"
		></wl-about-widget>

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

		<!-- Widget ZObject JSON -->
		<div class="ext-wikilambda-widget">
			<wl-z-object-json
				:readonly="true"
				:zobject-raw="getZObjectAsJson"
			></wl-z-object-json>
		</div>

		<!-- Widget Publish Dialog -->
		<div class="ext-wikilambda-widget">
			<wl-z-object-publish
				v-if="edit"
			></wl-z-object-publish>
		</div>
	</div>
</template>

<script>

var ZObjectKeyValue = require( '../components/default-view-types/ZObjectKeyValue.vue' ),
	ZObjectJson = require( '../components/ZObjectJson.vue' ),
	ZObjectPublish = require( '../components/ZObjectPublish.vue' ),
	AboutWidget = require( '../components/widgets/About.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-default-view',
	components: {
		'wl-about-widget': AboutWidget,
		'wl-z-object-publish': ZObjectPublish,
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
			'getViewMode'
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
}
</style>
