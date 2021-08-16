<template>
	<!--
		WikiLambda Vue component for generic ZObjects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zreference">
		<span v-if="isReadOnly">
			<a
				:href="referenceLink"
				:target="referenceLinkTarget"
				class="referenced-type"
			>
				{{ referenceLabel }}
			</a>
		</span>

		<z-object-selector
			v-else
			:placeholder="$i18n( 'wikilambda-zobjectselector-label' )"
			:selected-id="referenceValue"
			:type="searchType"
			@input="setZReference"
		></z-object-selector>
	</div>
</template>

<script>
var Constants = require( './../../Constants.js' ),
	ZObjectSelector = require( './../ZObjectSelector.vue' ),
	typeUtils = require( './../../mixins/typeUtils.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	name: 'ZReference',
	components: {
		'z-object-selector': ZObjectSelector
	},
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
	mixins: [ typeUtils ],
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
				return '/wiki/ZObject:' + this.referenceValue;
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
			'fetchZKeys'
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
			}
		}
	),
	created: function () {
		if ( this.referenceValue ) {
			this.fetchZKeys( [ this.referenceValue ] );
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zreference {
	display: inline;

	.referenced-type {
		font-style: italic;
		font-size: 0.9em;
	}
}
</style>
