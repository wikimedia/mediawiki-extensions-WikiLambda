<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zobject-generic">
		<span>{{ z1k1label }} ({{ Constants.Z_OBJECT_TYPE }}): </span>

		<span v-if="persistent">
			<a v-if="type !== zobjectId && viewmode" :href="'./ZObject:' + type">
				<span>{{ typeLabel }} ({{ type }})</span>
			</a>
			<span v-else>{{ typeLabel }} ({{ type }})</span>
			<ul><li> {{ z2k1label }} ({{ Constants.Z_PERSISTENTOBJECT_ID }}): {{ z2K1Value }} </li></ul>
		</span>

		<span v-else>
			<span v-if="viewmode || type"> {{ typeLabel }} ({{ type }})</span>
			<z-object-selector
				v-else
				:viewmode="viewmode"
				:type="Constants.Z_TYPE"
				:placeholder="$i18n( 'wikilambda-typeselector-label' )"
				:selected-id="type"
				@input="onTypeChange"
			></z-object-selector>
		</span>

		<z-object-key-list
			ref="keyList"
			:zobject-id="zobjectId"
			:viewmode="viewmode"
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
		},
		viewmode: {
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
			'zLangs',
			'zKeyLabels',
			'zKeys',
			'fetchingZKeys'
		] ),
		mapGetters( [
			'getZObjectChildrenById', 'getCurrentZObjectId'
		] ),
		{
			typeLabel: function () {
				return this.zKeyLabels[ this.type ];
			},
			z1k1label: function () {
				return this.zKeyLabels[ Constants.Z_OBJECT_TYPE ];
			},
			z2k1label: function () {
				return this.zKeyLabels[ Constants.Z_PERSISTENTOBJECT_ID ];
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
		// Fetch the information of the zid (and relevant
		// key labels) if it's not yet available.
		if (
			this.type !== 'root' &&
			( !( this.type in this.zKeys ) ) &&
			( this.fetchingZKeys.indexOf( this.type ) === -1 )
		) {
			this.fetchZKeys( {
				zids: [ this.type ],
				zlangs: this.zLangs
			} );
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
