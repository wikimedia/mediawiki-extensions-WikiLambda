<template>
	<!--
		WikiLambda Vue component for generic ZObjects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zreference">
		<span v-if="isReadOnly">
			<a
				:href="referenceLink"
				:target="referenceLinkTarget"
				class="ext-wikilambda-referenced-type"
			>
				{{ referenceLabel }}
			</a>
		</span>
		<wl-z-object-selector
			:selected-id="referenceValue"
			:initial-selection-label="referenceLabel"
			:type="searchType"
			:zobject-id="referenceItem.id"
			@input="setZReference"
		></wl-z-object-selector>
	</div>
</template>

<script>
var Constants = require( './../../Constants.js' ),
	ZObjectSelector = require( './../ZObjectSelector.vue' ),
	typeUtils = require( './../../mixins/typeUtils.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-reference',
	components: {
		'wl-z-object-selector': ZObjectSelector
	},
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number,
			default: -1
		},
		zobjectKey: {
			type: String,
			default: ''
		},
		searchType: {
			type: String,
			default: ''
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	computed: $.extend( {},
		mapGetters( {
			getZObjectChildrenById: 'getZObjectChildrenById',
			getZkeyLabels: 'getZkeyLabels',
			getCurrentZObjectId: 'getCurrentZObjectId'
		} ),
		{
			Constants: function () {
				return Constants;
			},
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			referenceItem: function () {
				return this.findKeyInArray( Constants.Z_REFERENCE_ID, this.zobject );
			},
			referenceValue: function () {
				return this.zobjectKey || this.referenceItem.value;
			},
			referenceLabel: function () {
				return this.getZkeyLabels[ this.referenceValue ];
			},
			isReadOnly: function () {
				return this.viewmode || this.readonly || this.getCurrentZObjectId === this.referenceValue;
			},
			isReadOnlyEditMode: function () {
				return !this.viewmode && ( this.readonly || this.getCurrentZObjectId === this.referenceValue );
			},
			referenceLink: function () {
				return new mw.Title( this.referenceValue ).getUrl();
			},
			referenceLinkTarget: function () {
				if ( this.isReadOnlyEditMode ) {
					return '_blank';
				}

				return;
			}
		}
	),
	methods: $.extend( {},
		mapActions( [
			'setZObjectValue',
			'fetchZKeys',
			'setIsZObjectDirty'
		] ),
		{
			/**
			 * Sets the value of a ZReference.
			 *
			 * @param {string} value
			 */
			setZReference: function ( value ) {
				var payload = {
					id: this.referenceItem.id,
					value: value
				};
				this.setZObjectValue( payload );
				this.setIsZObjectDirty( true );
			}
		}
	),
	created: function () {
		if ( this.referenceValue ) {
			this.fetchZKeys( { zids: [ this.referenceValue ] } );
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zreference {
	display: inline;

	.ext-wikilambda-referenced-type {
		font-style: italic;
		font-size: 0.9em;
	}
}
</style>
