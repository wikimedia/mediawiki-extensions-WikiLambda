<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zobject-generic">
		<span>{{ z1k1label }} ({{ Constants.Z_OBJECT_TYPE }}): </span>

		<span v-if="persistent">
			<a v-if="type !== zobjectId && getViewMode" :href="'./ZObject:' + type">
				<span>{{ typeLabel }} ({{ type }})</span>
			</a>
			<span v-else>{{ typeLabel }} ({{ type }})</span>
			<ul><li> {{ z2k1label }} ({{ Constants.Z_PERSISTENTOBJECT_ID }}): {{ z2K1Value }} </li></ul>
		</span>

		<span v-else>
			<span v-if="getViewMode || type"> {{ typeLabel }} ({{ type }})</span>
			<z-object-selector
				v-else
				:type="Constants.Z_TYPE"
				:placeholder="$i18n( 'wikilambda-typeselector-label' )"
				:selected-id="type"
				@input="onTypeChange"
			></z-object-selector>
		</span>

		<z-object-key-list
			ref="keyList"
			:zobject-id="zobjectId"
		></z-object-key-list>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	ZObjectSelector = require( './ZObjectSelector.vue' ),
	ZObjectKeyList = require( './ZObjectKeyList.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	mapState = require( 'vuex' ).mapState;

module.exports = {
	name: 'ZObjectGeneric',
	components: {
		'z-object-key-list': ZObjectKeyList,
		'z-object-selector': ZObjectSelector
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		type: {
			type: String,
			required: true
		},
		persistent: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			Constants: Constants,
			lastTypeKeys: []
		};
	},
	computed: $.extend( {},
		mapState( [
			'fetchingZKeys'
		] ),
		mapGetters( [
			'getZObjectChildrenById',
			'getCurrentZObjectId',
			'getZkeyLabels',
			'getViewMode'
		] ),
		{
			typeLabel: function () {
				return this.getZkeyLabels[ this.type ];
			},
			z1k1label: function () {
				return this.getZkeyLabels[ Constants.Z_OBJECT_TYPE ];
			},
			z2k1label: function () {
				return this.getZkeyLabels[ Constants.Z_PERSISTENTOBJECT_ID ];
			},
			z2K1Value: function () {
				return this.getCurrentZObjectId;
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys', 'changeType' ] ),
		{
			/**
			 * Sets the type of a ZObject key.
			 *
			 * @param {string} type
			 * @param {number} id
			 */
			onTypeChange: function ( type ) {
				var payload = {
					id: this.zobjectId,
					type: type
				};
				this.changeType( payload );
			}
		}
	),
	mounted: function () {
		if ( this.type !== 'root' ) {
			this.fetchZKeys( [ this.type ] );
		}
	}
};

</script>

<style lang="less">
.ext-wikilambda-zobject-generic {
	background: #fff;
	outline: 2px dashed #808080;
	padding: 1em;
}
</style>
