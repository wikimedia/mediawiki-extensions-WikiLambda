<!--
	WikiLambda Vue component for viewing function description.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-viewer-description">
		<wl-text-component :truncate="300">
			{{ description }}
		</wl-text-component>
	</div>
</template>

<script>
const TextComponent = require( '../../../base/Text.vue' );

var mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-function-viewer-about-description',
	components: {
		'wl-text-component': TextComponent
	},
	computed: $.extend( mapGetters( [
		'getZPersistentDescription',
		'getZMonolingualTextValue'
	] ),
	{
		/**
		 * Fetch the Short Description (Z2K5) rows or null if not set.
		 *
		 * @return {string|null}
		 */
		zObjectDescription: function () {
			return this.getZPersistentDescription();
		},
		/**
		 * Fetch whether the ZPersistentObject has a Short Description (Z2K5) set
		 *
		 * @return
		 */
		hasDescription: function () {
			return this.zObjectDescription !== undefined;
		},
		/**
		 * Fetch the Short Description (Z2K5) row for the current view language
		 *
		 * @return {string}
		 */
		description: function () {
			return this.hasDescription ? this.getZMonolingualTextValue( this.zObjectDescription.rowId ) : '';
		}
	}
	)
};

</script>

<style lang="less">
.ext-wikilambda-function-viewer-description {
	& > p {
		margin: 0;
	}
}
</style>
